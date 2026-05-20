import type { SavingsAccount } from '../types'
import { createHouseholdCrud } from './crud'

const ops = createHouseholdCrud<SavingsAccount>('savingsAccounts')

export const fetchSavingsAccounts = ops.fetch
export const addSavingsAccount = ops.add
export const updateSavingsAccount = ops.update
export const deleteSavingsAccount = ops.remove
