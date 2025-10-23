export type ID = string
export interface Medicine { id: ID; name: string }
export interface Disease { id: ID; name: string }
export interface Link { medicineId: ID; diseaseId: ID }


export type SearchType = 'medicine' | 'disease'


export interface SearchResponse {
    type: SearchType
    query: string
    matches: Array<{ id: ID; name: string }>
    related: Array<{ id: ID; name: string }>
}