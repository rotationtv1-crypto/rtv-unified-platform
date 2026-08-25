import {
  createTributeSignature,
  verifyTributeSignature,
} from '../_shared/tributeSignature.ts'

const secret = 'tribute-test-api-key'
const body = '{"name":"new_donation","payload":{"amount":100}}'

Deno.test('accepts a valid Tribute HMAC signature', async () => {
  const signature = await createTributeSignature(body, secret)
  const valid = await verifyTributeSignature(body, signature, secret)

  if (!valid) throw new Error('expected valid signature to verify')
})

Deno.test('accepts a sha256= prefixed signature', async () => {
  const signature = await createTributeSignature(body, secret)
  const valid = await verifyTributeSignature(body, `sha256=${signature}`, secret)

  if (!valid) throw new Error('expected prefixed signature to verify')
})

Deno.test('rejects a missing signature', async () => {
  const valid = await verifyTributeSignature(body, null, secret)

  if (valid) throw new Error('expected missing signature to be rejected')
})

Deno.test('rejects a modified body', async () => {
  const signature = await createTributeSignature(body, secret)
  const valid = await verifyTributeSignature(`${body} `, signature, secret)

  if (valid) throw new Error('expected modified body to be rejected')
})

Deno.test('rejects the wrong secret', async () => {
  const signature = await createTributeSignature(body, secret)
  const valid = await verifyTributeSignature(body, signature, 'wrong-secret')

  if (valid) throw new Error('expected wrong secret to be rejected')
})

Deno.test('rejects malformed signatures', async () => {
  const valid = await verifyTributeSignature(body, 'not-a-signature', secret)

  if (valid) throw new Error('expected malformed signature to be rejected')
})
