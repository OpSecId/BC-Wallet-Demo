import type { AxiosRequestConfig } from 'axios'

import axios from 'axios'
import moment from 'moment'

export let agentKey = ''

export const tractionBaseUrl = process.env.TRACTION_URL ?? ''

function tractionEnvOrThrow(): { tractionBaseUrl: string; tenantId: string; apiKey: string } {
  const tractionBaseUrl = (process.env.TRACTION_URL ?? '').trim().replace(/\/$/, '')
  const tenantId = (process.env.TENANT_ID ?? '').trim()
  const apiKey = (process.env.API_KEY ?? '').trim()
  const missing: string[] = []
  if (!tractionBaseUrl) missing.push('TRACTION_URL')
  if (!tenantId) missing.push('TENANT_ID')
  if (!apiKey) missing.push('API_KEY')
  if (missing.length) {
    throw new Error(
      `Missing required Traction env: ${missing.join(', ')}. Without them the server calls ` +
        `\`/multitenancy/tenant/{TENANT_ID}/token\` on localhost and fails. Set variables in your host (e.g. Railway).`
    )
  }
  const issuer = (process.env.ISSUER_ID ?? process.env.TRACTION_DID ?? '').trim()
  if (!issuer) {
    throw new Error(
      'Missing TRACTION_DID or ISSUER_ID (public did:webvh used as AnonCreds issuerId). Set it in your deployment env.'
    )
  }
  return { tractionBaseUrl, tenantId, apiKey }
}

export const tractionApiKeyUpdaterInit = async () => {
  const { tractionBaseUrl, tenantId, apiKey } = tractionEnvOrThrow()
  agentKey =
    (await axios.post(`${tractionBaseUrl}/multitenancy/tenant/${tenantId}/token`, { api_key: apiKey })).data?.token ??
    agentKey
  // refresh agent key every hour
  setInterval(async () => {
    const env = tractionEnvOrThrow()
    agentKey =
      (await axios.post(
        `${env.tractionBaseUrl}/multitenancy/tenant/${env.tenantId}/token`,
        { api_key: env.apiKey }
      )).data?.token ?? agentKey
  }, 3600000)
}

/** Build ACA-Py issue-credential/2.0 /send body with AnonCreds filter (askar-anoncreds). */
export function buildV20IssueCredentialSendBody(params: {
  connection_id: string
  cred_def_id: string
  credential_preview?: { attributes: Array<{ name: string; value: string; 'mime-type'?: string | null; mime_type?: string | null }> }
  /** @deprecated v1.0 shape; still accepted */
  credential_proposal?: { attributes: Array<{ name: string; value: string; 'mime-type'?: string | null; mime_type?: string | null }> }
}) {
  const issuerId = process.env.ISSUER_ID ?? process.env.TRACTION_DID
  const attrs =
    params.credential_preview?.attributes ?? params.credential_proposal?.attributes ?? []
  return {
    connection_id: params.connection_id,
    filter: {
      anoncreds: {
        cred_def_id: params.cred_def_id,
        ...(issuerId ? { issuer_id: issuerId } : {}),
      },
    },
    credential_preview: {
      '@type': 'issue-credential/2.0/credential-preview',
      attributes: attrs.map((a) => ({
        name: a.name,
        value: String(a.value ?? ''),
        ...((a['mime-type'] ?? a.mime_type) != null && (a['mime-type'] ?? a.mime_type) !== ''
          ? { 'mime-type': (a['mime-type'] ?? a.mime_type) as string }
          : {}),
      })),
    },
    auto_remove: true,
  }
}

/** Build present-proof/2.0 send-request (or create-request) inner payload with AnonCreds presentation_request. */
export function buildV20AnonCredsPresentationRequest(proofRequest: {
  name?: string
  version?: string
  requested_attributes?: Record<string, unknown>
  requested_predicates?: Record<string, unknown>
  non_revoked?: { from?: number; to?: number }
  auto_verify?: boolean
  auto_present?: boolean
}) {
  const { name, version, requested_attributes, requested_predicates, non_revoked } = proofRequest
  return {
    anoncreds: {
      name: name ?? 'proof',
      version: version ?? '1.0',
      requested_attributes: requested_attributes ?? {},
      requested_predicates: requested_predicates ?? {},
      ...(non_revoked ? { non_revoked } : {}),
    },
  }
}

export const tractionRequest = {
  get: (url: string, config?: AxiosRequestConfig<any>) => {
    return axios.get(`${process.env.TRACTION_URL}${url}`, {
      ...config,
      timeout: 80000,
      headers: { ...config?.headers, Authorization: `Bearer ${agentKey}` },
    })
  },
  delete: (url: string, config?: AxiosRequestConfig<any>) => {
    return axios.delete(`${process.env.TRACTION_URL}${url}`, {
      ...config,
      timeout: 80000,
      headers: { ...config?.headers, Authorization: `Bearer ${agentKey}` },
    })
  },
  post: (url: string, data: any, config?: AxiosRequestConfig<any>) => {
    return axios.post(`${process.env.TRACTION_URL}${url}`, data, {
      ...config,
      timeout: 80000,
      headers: { ...config?.headers, Authorization: `Bearer ${agentKey}` },
    })
  },
}

export const tractionGarbageCollection = async () => {
  // delete all connections that are older than one day
  const cleanupConnections = async () => {
    const connections: any[] = (await tractionRequest.get('/connections')).data.results
    connections.forEach((conn) => {
      if (
        moment().diff(moment(conn.created_at), 'hours') >= 12 &&
        conn.alias !== 'endorser' &&
        conn.alias !== 'bcovrin-test-endorser'
      ) {
        tractionRequest.delete(`/connections/${conn.connection_id}`)
      }
    })
  }
  const cleanupExchangeRecords = async () => {
    const records: any[] = (await tractionRequest.get('/issue-credential-2.0/records')).data.results
    records.forEach((record) => {
      if (moment().diff(moment(record.created_at), 'hours') >= 12) {
        const id = record.cred_ex_id ?? record.credential_exchange_id
        if (id) tractionRequest.delete(`/issue-credential-2.0/records/${id}`)
      }
    })
  }
  const cleanupProofRecords = async () => {
    const proofs: any[] = (await tractionRequest.get('/present-proof-2.0/records')).data.results
    proofs.forEach((proof) => {
      if (moment().diff(moment(proof.created_at), 'hours') >= 12) {
        const id = proof.pres_ex_id ?? proof.presentation_exchange_id
        if (id) tractionRequest.delete(`/present-proof-2.0/records/${id}`)
      }
    })
  }
  cleanupConnections()
  cleanupExchangeRecords()
  cleanupProofRecords()
  setInterval(async () => {
    cleanupConnections()
    cleanupExchangeRecords()
    cleanupProofRecords()
  }, 6 * 60 * 60 * 1000)
}
