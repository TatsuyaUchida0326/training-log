/**
 * テストから localStorage のキーを直書きしないための集約。
 * 実体は各フックが持つ定義をそのまま再 export するので、キー名を変えてもテストが追随する。
 */
export { STORAGE_KEY as RECORDS_KEY } from '../hooks/useTrainingRecords'
export { STORAGE_KEY as EXERCISES_KEY } from '../hooks/useExercises'
export { STORAGE_KEY as SETTINGS_KEY } from '../hooks/useSettings'
