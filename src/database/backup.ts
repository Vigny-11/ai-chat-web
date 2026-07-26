import type { BackupData } from '@/types'
import { downloadBlob } from '@/utils/format'
import { backupFilename, parseBackupZip } from '@/services/storage/backupFiles'
import { localStorageService } from '@/services/storage/LocalStorageService'

export const collectBackupData = async (): Promise<BackupData> => localStorageService.collectBackupData()

export const exportBackupZip = async () => {
  downloadBlob(await localStorageService.exportData(), backupFilename())
}

export const readBackupFile = async (file: File): Promise<BackupData> => parseBackupZip(file)

export const importBackupData = async (backup: BackupData, mode: 'merge' | 'overwrite') => {
  await localStorageService.importData(backup, mode)
}
