import { createHouseholdCrud } from './crud'
import type { SecuritiesAccount } from '../types'

const ops = createHouseholdCrud<SecuritiesAccount>('securitiesAccounts')

export const fetchSecuritiesAccounts = ops.fetch
export const addSecuritiesAccount = ops.add
export const updateSecuritiesAccount = ops.update
export const deleteSecuritiesAccount = ops.remove
