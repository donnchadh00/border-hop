export function isoFrom(props: any, id?: string | number): string | undefined {
  const candidates = [
    props?.adm0_a3,
    props?.adm0_iso,
    props?.gu_a3,
    props?.su_a3,
    props?.brk_a3,
    props?.iso_a3_eh,
    props?.wb_a3,
    props?.sov_a3,
    props?.iso_a3,
    typeof id === "string" ? id : null,
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const code = String(cand).toUpperCase().trim();
    if (code === "-99") continue;
    if (!/^[A-Z]{3}$/.test(code)) continue;
    return code;
  }

  return undefined;
}

export function nameFrom(props: any): string {
  return (
    props?.name ||
    props?.admin ||
    props?.name_en ||
    props?.formal_en ||
    "Unknown"
  );
}
