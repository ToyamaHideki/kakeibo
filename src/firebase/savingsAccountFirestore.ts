import { createHouseholdCrud } from './crud'
import type { SavingsAccount } from '../types'

const ops = createHouseholdCrud<SavingsAccount>('savingsAccounts')

export const fetchSavingsAccounts = ops.fetch
export const addSavingsAccount = ops.add
export const updateSavingsAccount = ops.update
export const deleteSavingsAccount = ops.remove
