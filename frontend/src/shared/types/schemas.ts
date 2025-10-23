// From your provided backend schemas
export interface DatasetItemSchema {
  id: string // UUID is a string in JSON
  class_names: string[]
  ratio: number
  num_pairs: number
  train_count: number
  val_count: number
  created_at: string // datetime is a string in JSON
  download_url: string
}