/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
export class exportCSV {
  /**
   * @desc get table data as json
   * @param data
   * @param columns
   */

  static getTableDataForExport = (data: any[], columns: any[]) =>
    data?.map((record: any) =>
      columns.reduce(
        (recordToDownload, column) => ({
          ...recordToDownload,
          [column.Header]: record[column.accessor],
        }),
        {}
      )
    );

  /**
   * @desc make csv from given data
   * @param rows
   * @param filename
   */
  static makeCsv = async (
    rows: any[],
    filename: string,
    separator = ";",
    header = ""
  ) => {
    const keys: string[] = Object.keys(rows[0]);
    if (header === "") {
      header = keys.join(separator);
    }
    const csvContent = `${header}\n${rows
      .map((row) =>
        keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? "" : row[k];

            cell =
              cell instanceof Date
                ? cell.toLocaleString()
                : cell.toString().replace(/"/g, '""');

            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator)
      )
      .join("\n")}`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
}
