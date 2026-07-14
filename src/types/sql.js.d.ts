/** sql.js 的类型声明 */
declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string, params?: any[]): QueryExecResult[]
    export(): Uint8Array
    close(): void
  }

  interface InitSqlJsConfig {
    locateFile?: (file: string) => string
  }

  function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>

  export default initSqlJs
  export { Database, SqlJsStatic, QueryExecResult }
}
