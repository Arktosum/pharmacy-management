import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Patient, VisitPrescription, VisitSymptomRef } from '../types'

const base = 'http://localhost:3000/api/patients'

export const patientApi = createApi({
    reducerPath: 'patientApi',
    baseQuery: fetchBaseQuery({ baseUrl: base }),
    tagTypes: ['Patient'],
    endpoints: builder => ({
        getPatients: builder.query<Patient[], void>({
            query: () => '/',
            providesTags: res =>
                res
                    ? [
                        ...res.map(p => ({ type: 'Patient' as const, id: p.id })),
                        { type: 'Patient', id: 'LIST' },
                    ]
                    : [{ type: 'Patient', id: 'LIST' }],
        }),
        createPatient: builder.mutation<
            Patient,
            {
                patientNumber?: number | null
                name: string
                description?: string
                visitDate?: string
                notes?: string
            }
        >({
            query: body => ({ url: '/', method: 'POST', body }),
            invalidatesTags: [{ type: 'Patient', id: 'LIST' }],
        }),
        updatePatient: builder.mutation<
            Patient,
            {
                id: string
                patientNumber?: number
                name?: string
                description?: string
            }
        >({
            query: ({ id, ...body }) => ({ url: `/${id}`, method: 'PUT', body }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: 'Patient', id },
                { type: 'Patient', id: 'LIST' },
            ],
        }),
        deletePatient: builder.mutation<void, string>({
            query: id => ({ url: `/${id}`, method: 'DELETE' }),
            invalidatesTags: (_res, _err, id) => [
                { type: 'Patient', id },
                { type: 'Patient', id: 'LIST' },
            ],
        }),
        upsertVisit: builder.mutation<
            Patient,
            {
                patientId: string
                date: string
                activeSymptoms: VisitSymptomRef[]
                notes?: string
                prescriptions?: VisitPrescription[]
            }
        >({
            query: ({ patientId, date, ...body }) => ({
                url: `/${patientId}/visits/${date}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_res, _err, { patientId }) => [
                { type: 'Patient', id: patientId },
                { type: 'Patient', id: 'LIST' },
            ],
        }),
        deleteVisit: builder.mutation<Patient, { patientId: string; date: string }>({
            query: ({ patientId, date }) => ({
                url: `/${patientId}/visits/${date}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_res, _err, { patientId }) => [
                { type: 'Patient', id: patientId },
                { type: 'Patient', id: 'LIST' },
            ],
        }),
    }),
})

export const {
    useGetPatientsQuery,
    useCreatePatientMutation,
    useUpdatePatientMutation,
    useDeletePatientMutation,
    useUpsertVisitMutation,
    useDeleteVisitMutation,
} = patientApi
