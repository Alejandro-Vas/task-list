import { toCsv } from './csv';

const BOM = '\uFEFF';

describe('should serialize cells following RFC 4180', () => {
  it('should write a header row, CRLF records and a leading BOM', () => {
    const csv = toCsv(['id', 'title'], [['1', 'First'], ['2', 'Second']]);

    expect(csv).toBe(`${BOM}id,title\r\n1,First\r\n2,Second\r\n`);
  });

  it('should quote a cell containing a comma', () => {
    const csv = toCsv(['title'], [['Hello, world']]);

    expect(csv).toBe(`${BOM}title\r\n"Hello, world"\r\n`);
  });

  it('should double the quotes inside a quoted cell', () => {
    const csv = toCsv(['title'], [['Say "hi"']]);

    expect(csv).toBe(`${BOM}title\r\n"Say ""hi"""\r\n`);
  });

  it('should quote a cell containing a line break', () => {
    const csv = toCsv(['description'], [['line one\nline two\r\n']]);

    expect(csv).toBe(`${BOM}description\r\n"line one\nline two\r\n"\r\n`);
  });

  it('should leave a plain cell unquoted', () => {
    const csv = toCsv(['title'], [['Plain title: no separators']]);

    expect(csv).toBe(`${BOM}title\r\nPlain title: no separators\r\n`);
  });

  it('should render null and undefined as empty cells', () => {
    const csv = toCsv(['a', 'b'], [[null, undefined]]);

    expect(csv).toBe(`${BOM}a,b\r\n,\r\n`);
  });

  it('should render dates as ISO strings', () => {
    const csv = toCsv(['dueDate'], [[new Date('2026-01-31T10:00:00.000Z')]]);

    expect(csv).toBe(`${BOM}dueDate\r\n2026-01-31T10:00:00.000Z\r\n`);
  });

  it('should keep the row shape when every cell needs quoting', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'z"w']]);

    expect(csv).toBe(`${BOM}a,b\r\n"x,y","z""w"\r\n`);
  });
});
