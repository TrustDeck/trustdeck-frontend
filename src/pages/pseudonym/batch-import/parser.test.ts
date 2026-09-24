import { beforeEach, describe, expect, it, vi } from 'vitest'

import readExcelFile from 'read-excel-file/browser'
import { parseImportFile, prepareSheet } from './parser'

vi.mock('read-excel-file/browser', () => ({ default: vi.fn() }))

const mockedReadExcelFile = vi.mocked(readExcelFile)

describe('batch import parser', () => {
  beforeEach(() => mockedReadExcelFile.mockReset())

  it('parses comma CSV with quotes, CRLF, BOM, trailing cells, and leading zeros', async () => {
    const file = new File(
      [
        '\uFEFFidentifier,idType,note\r\n"00012345",PatientID,"a,b"\r\n00000002,,\r\n'
      ],
      'patients.csv'
    )
    const [sheet] = await parseImportFile(file)
    expect(sheet.headers).toEqual(['identifier', 'idType', 'note'])
    expect(sheet.rows[0].values).toEqual(['00012345', 'PatientID', 'a,b'])
    expect(sheet.rows[1].values).toEqual(['00000002', null, null])
  })

  it('parses semicolon CSV and escaped quotes', async () => {
    const file = new File(
      ['id;type;comment\n"001";PatientID;"say ""hello"""\n'],
      'patients.csv'
    )
    const [sheet] = await parseImportFile(file, ';')
    expect(sheet.headers).toEqual(['id', 'type', 'comment'])
    expect(sheet.rows[0].values[2]).toBe('say "hello"')
  })

  it('supports an XLSX workbook with multiple sheets and string numbers', async () => {
    mockedReadExcelFile.mockResolvedValue([
      {
        sheet: 'First',
        data: [
          ['id', 'type'],
          ['0001', 'PatientID']
        ]
      },
      { sheet: 'Second', data: [['id'], ['0002']] }
    ])
    const file = new File(['not-used-by-mock'], 'patients.xlsx')
    const sheets = await parseImportFile(file)
    expect(sheets.map((sheet) => sheet.name)).toEqual(['First', 'Second'])
    expect(sheets[0].rows[0].values[0]).toBe('0001')
    const options = mockedReadExcelFile.mock.calls[0]?.[1]
    expect(options?.parseNumber?.('0003')).toBe('0003')
  })

  it('rejects legacy XLS by extension before parsing', async () => {
    await expect(
      parseImportFile(new File(['legacy'], 'patients.xls'))
    ).rejects.toMatchObject({ code: 'xls-not-supported' })
    expect(mockedReadExcelFile).not.toHaveBeenCalled()
  })

  it('generates stable headers when no header row is selected', () => {
    const sheet = prepareSheet(
      'CSV',
      [
        { sourceRowNumber: 1, values: ['0001', 'PatientID'] },
        { sourceRowNumber: 2, values: ['0002', 'PatientID'] }
      ],
      null
    )
    expect(sheet.headers).toEqual(['Column A', 'Column B'])
    expect(sheet.rows[0].sourceRowNumber).toBe(1)
  })
})
