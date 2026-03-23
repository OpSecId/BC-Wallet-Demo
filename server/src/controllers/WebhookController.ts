import type { Socket } from 'socket.io'

import { Body, JsonController, Post, Req } from 'routing-controllers'
import { Service } from 'typedi'

function normalizeAcaPyWebhookPayload(endpoint: string, params: Record<string, unknown>) {
  // AIP 2.0 / AnonCreds webhooks use cred_ex_id / pres_ex_id; keep v1 field names for the UI.
  if (params.pres_ex_id != null && params.presentation_exchange_id == null) {
    params.presentation_exchange_id = params.pres_ex_id
  }
  if (params.cred_ex_id != null && params.credential_exchange_id == null) {
    params.credential_exchange_id = params.cred_ex_id
  }
  if (params.cred_def_id != null && params.credential_definition_id == null) {
    params.credential_definition_id = params.cred_def_id
  }
  if (params.rev_reg_id != null && params.revoc_reg_id == null) {
    params.revoc_reg_id = params.rev_reg_id
  }
  // Map v2.0 topics to legacy endpoint labels the React app listens for.
  if (endpoint.startsWith('issue_credential_v2')) {
    params.endpoint = 'issue_credential'
  } else if (endpoint.startsWith('present_proof_v2')) {
    params.endpoint = 'present_proof'
  }
}

@JsonController('/whook/topic')
@Service()
export class WebhookController {
  @Post('/*')
  public async handlePostWhook(@Body() params: any, @Req() req: any) {
    const socketMap: Map<string, Socket> = req.app.get('sockets')
    const api_key = req.headers['x-api-key']
    if (api_key !== process.env.WEBHOOK_SECRET) {
      return { message: 'Unauthorized', status: 401 }
    }
    const connectionId = params.connection_id
    const path = req.path.endsWith('/') ? req.path.slice(0, -1) : req.path
    const endpointSplit = path.split('/')
    const endpoint = endpointSplit[endpointSplit.length - 1]
    params.endpoint = endpoint
    normalizeAcaPyWebhookPayload(endpoint, params)

    const socket = socketMap.get(connectionId)
    if (socket) {
      socket.emit('message', params)
    }
    return { message: 'Webhook received' }
  }
}
