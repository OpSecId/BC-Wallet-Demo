import { Body, JsonController, Post } from 'routing-controllers'
import { Service } from 'typedi'

import { buildV20AnonCredsPresentationRequest, buildV20IssueCredentialSendBody, tractionRequest } from '../utils/tractionHelper'

@JsonController('/deeplink')
@Service()
export class DeeplinkController {
  @Post('/offerCredential')
  public async offerCredential(@Body() params: any) {
    const state = await this.waitUntilConnected(params.connection_id)
    if (this.isConnected(state)) {
      const resp = await tractionRequest.post(`/issue-credential-2.0/send`, buildV20IssueCredentialSendBody(params))
      return resp.data
    }
  }

  @Post('/requestProof')
  public async requestProof(@Body() params: any) {
    const state = await this.waitUntilConnected(params.connection_id)
    if (this.isConnected(state)) {
      const resp = await tractionRequest.post('/present-proof-2.0/send-request', {
        connection_id: params.connection_id,
        comment: params.comment,
        auto_verify: params.auto_verify ?? true,
        presentation_request: buildV20AnonCredsPresentationRequest(params.proof_request ?? {}),
      })
      return resp.data
    }
  }

  private isConnected(state: string) {
    return state === 'complete' || state === 'response' || state === 'active'
  }

  private async waitUntilConnected(connectionId: string): Promise<string> {
    let state = ''
    for (let i = 0; i < 10 && !this.isConnected(state); i++) {
      await new Promise((r) => setTimeout(r, 1000))
      if (!this.isConnected(state)) {
        tractionRequest.get(`/connections/${connectionId}`).then((resp) => {
          state = resp.data?.state
        })
      }
    }
    return state
  }
}
