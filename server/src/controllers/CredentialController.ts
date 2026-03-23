import { Body, Delete, Get, InternalServerError, JsonController, NotFoundError, Param, Post } from 'routing-controllers'
import { Inject, Service } from 'typedi'

import { Credential } from '../content/types'
import { buildV20IssueCredentialSendBody, tractionRequest } from '../utils/tractionHelper'
@JsonController('/credentials')
@Service()
export class CredentialController {
  @Get('/connId/:connId')
  public async getCredByConnId(@Param('connId') connId: string) {
    const res = (
      await tractionRequest.get('/issue-credential-2.0/records', {
        params: {
          connection_id: connId,
        },
      })
    ).data

    return res
  }

  @Post('/getOrCreateCredDef')
  public async getOrCreateCredDef(@Body() credential: Credential) {
    const issuerId = process.env.ISSUER_ID ?? process.env.TRACTION_DID
    if (!issuerId) {
      throw new InternalServerError(
        'TRACTION_DID or ISSUER_ID must be set for AnonCreds schema and credential-definition requests'
      )
    }

    const schemas = (
      await tractionRequest.get(`/anoncreds/schemas`, {
        params: {
          schema_name: credential.name,
          schema_version: credential.version,
          schema_issuer_id: issuerId,
        },
      })
    ).data
    let schema_id = ''
    if (!schemas.schema_ids?.length) {
      const schemaAttrs = credential.attributes.map((attr) => attr.name)
      const resp = (
        await tractionRequest.post(`/anoncreds/schema`, {
          schema: {
            attrNames: schemaAttrs,
            issuerId,
            name: credential.name,
            version: credential.version,
          },
          options: {},
        })
      ).data
      schema_id = resp.schema_state?.schema_id ?? resp.sent?.schema_id
      if (!schema_id) {
        throw new InternalServerError('Schema creation did not return schema_id')
      }
      await new Promise((r) => setTimeout(r, 5000))
    } else {
      schema_id = schemas.schema_ids[0]
    }

    const credDefs = (
      await tractionRequest.get(`/anoncreds/credential-definitions`, {
        params: { schema_id, issuer_id: issuerId },
      })
    ).data
    let cred_def_id = ''
    if (!credDefs.credential_definition_ids?.length) {
      const resp = (
        await tractionRequest.post(`/anoncreds/credential-definition`, {
          credential_definition: {
            issuerId,
            schemaId: schema_id,
            tag: credential.name,
          },
          options: {
            support_revocation: false,
          },
        })
      ).data
      cred_def_id =
        resp.credential_definition_state?.credential_definition_id ?? resp.sent?.credential_definition_id
      if (!cred_def_id) {
        throw new InternalServerError('Credential definition creation did not return credential_definition_id')
      }
    } else {
      cred_def_id = credDefs.credential_definition_ids[0]
    }
    return cred_def_id
  }

  @Post('/offerCredential')
  public async offerCredential(@Body() params: any) {
    const body = buildV20IssueCredentialSendBody(params)
    const response = await tractionRequest.post(`/issue-credential-2.0/send`, body)
    return response.data
  }
}
