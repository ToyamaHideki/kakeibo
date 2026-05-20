import type { SecuritiesAccount } from '../types'
import { createHouseholdCrud } from './crud'

const ops = createHouseholdCrud<SecuritiesAccount>('securitiesAccounts')

export const fetchSecuritiesAccounts = ops.fetch
export const addSecuritiesAccount = ops.add
export const updateSecuritiesAccount = ops.update
export const deleteSecuritiesAccount = ops.remove
