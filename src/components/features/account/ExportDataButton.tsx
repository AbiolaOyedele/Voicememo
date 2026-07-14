/**
 * Settings row that downloads the signed-in user's account and notes as a
 * JSON file. A plain anchor with `download` is enough — the browser sends the
 * session cookie on the same-origin navigation, and the route responds with
 * a Content-Disposition attachment header.
 */
export function ExportDataButton() {
  return (
    <li>
      <a
        href="/api/v1/account/export"
        download
        className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-[15px]">Export your data</span>
        <span className="text-muted text-xs">Download JSON</span>
      </a>
    </li>
  )
}
