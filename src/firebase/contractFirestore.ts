import { createHouseholdCrud } from './crud'
import type { Contract } from '../types'

const ops = createHouseholdCrud<Contract>('contracts')

export const fetchContracts = ops.fetch
export const addContract = ops.add
export const updateContract = ops.update
export const deleteContract = ops.remove
