/**
 * Generates email-safe HTML from structured signature data.
 * The HTML structure is FIXED and matches firma.html exactly.
 * Only the data values are substituted.
 */

export interface SignatureUserData {
  fullName: string;
  department: string;
  infoLine1: string;
  infoLine2: string;
  address: string;
  phone: string;
}

export interface SignatureTemplateData {
  id?: string;
  name?: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  showInstagram: boolean;
  showFacebook: boolean;
  showWeb: boolean;
  instagramUrl: string | null;
  facebookUrl: string | null;
  webLinkUrl: string | null;
  websiteUrl: string | null;
  website: string | null;
  disclaimerLang: "it" | "en";
  footerIt: string | null;
  footerEn: string | null;
  ecoText: string | null;
}

export const DEFAULT_USER_DATA: SignatureUserData = {
  fullName: "Nome Cognome",
  department: "Sales Dept.",
  infoLine1: "Offices of the trademarks' licensee",
  infoLine2: "Production Furniture International S.p.A.",
  address: "via Foggia 23/H - 10152 - Torino (TO)",
  phone: "Tel. +39 0110133330 - mobile +39 3450494194",
};

export const EMPTY_TEMPLATE: SignatureTemplateData = {
  logoUrl: null,
  bannerUrl: null,
  showInstagram: true,
  showFacebook: true,
  showWeb: true,
  instagramUrl: "https://www.instagram.com/gebruder_thonet_vienna/",
  facebookUrl: "https://www.facebook.com/GebruderThonetVienna",
  webLinkUrl: "https://www.gebruederthonetvienna.com/en",
  websiteUrl: "http://www.gebruederthonetvienna.com",
  website: "www.gebruederthonetvienna.com",
  disclaimerLang: "it",
  footerIt:
    'Le informazioni contenute nella presente comunicazione e i relativi allegati possono essere riservate e sono, comunque, destinate esclusivamente alle persone o alla Società sopraindicati. La diffusione, distribuzione e/o copiatura del documento trasmesso da parte di qualsiasi soggetto diverso dal destinatario è proibita, sia ai sensi dell\'art. 616 c.p., che ai sensi del D.Lgs. n. 196/2003, aggiornato a quanto sancito dal Reg. UE n. 679/2016 (GDPR) e dal D.Lgs. 101/2018. Se avete ricevuto questo messaggio per errore, vi preghiamo di distruggerlo e di informarci immediatamente inviando un messaggio all\'indirizzo e-mail <a href="mailto:info@gebruederthonetvienna.com">info@gebruederthonetvienna.com</a>',
  footerEn:
    'The information contained in this transmission and any attachments may contain privileged and confidential information. It is intended only for the use of the person(s) named above. If you are not the intended recipient, you are hereby notified that any review, dissemination, distribution or duplication of this communication is strictly prohibited. If you are not the intended recipient, please contact the sender by reply email and destroy all copies of the original message and any attachments immediately. To reply to our email administrator directly, please send an email to <a href="mailto:info@gebruederthonetvienna.com">info@gebruederthonetvienna.com</a>',
  ecoText: "Please don't print this e-mail unless you really need to!",
};

// Fixed social icons from firma.html (base64 encoded, round style)
const ICON_INSTAGRAM =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAHMJ3jJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGSUExURQAAAOdTcOQ8XORFY+I+YOhDYfCWqOVGY+1/k+Y/XuZBYuM5WeQ/YOdadf77/OlBYfvk6Pvk6eVMZupCYfjN1v3v8f3v8udYc/75+uRBX+RBYOhZdfjL0+NCXu6Fmf3t8OM1VuQ/X+Q/Xf73+OQ/XuQ/X+1DY+E/XffI0eVAX+VAYOVAX+lhe+ZAYOZBYONAXudBYOM8XORAX+dUcORAXutsheQ9XOQ9XehVcPfGz+NAX////9pIW/jH0O2AlPzo6/zo7ORBXu6KneM6WuM6W/KisehBYOhBYf78/P78/eREYvvl6eVFY+M/X/jO1u1+k+1+lONAX+6Im/3w8vKgsONAX98/X/76++x7kOM/X+FBXupBYedBX/zt8OI1VuI/X+RAXupuhuM2VuRAX/74+eRAXuRAX+hYc+hYdOM+YPvh5fvh5vjK0+2Dl/zr7vA8ae6El+6NoORGYNc6TuI/X/729+Q+XffH0Pvf5OI4cehBYO5DY+lgevjI0Olge+U/X+ZAYOM/XudBYOdAX+Q/XuM7W858NmgAAACFdFJOUwD///+aIv///4kf/1X//////wr/////////////Sf///9H//////1X///+r/5//ivP/7f+Z///////u/w7/////yP//////////////uf////P///9LEP//ySP/6v//SPf//9H//////yX//////xH//x0Nof////8J/v/////s/7j/S6yjJVBFAAAACXBIWXMAABcRAAAXEQHKJvM/AAAD8klEQVQ4T22UiV/iRhTHn6A0inZV1J1WXQ+yiKh4trGO4rojUokXXsVbNL6tR92uR7qCBx78330ziZRt+/18SCY/Xl5m3gUAHSN0QS2GcKjxXwSUx+5GBSlCIMAN/SBra3Y/oB7/DgENXoPwiALX5T8omQeoR7tXR+9XJAvUMI5cvY7GqVc0c4ySbaU0jX6mFUBXJHWhFhXKQUIuEdOaVoYRgBByD3lpwT4SJ5Ph658tzNPSrMVdwdQndmzO0cIn2Ed2L/y+DD5LD0IIG7ekt5z0+yBXkpeQ+g7mB/ZcZTPhKC5TUuuhxTJf+WCaZtss0xFz41BNWrrJg8kFc+nj95+CBcQA5EnUTGwID6LOC4IJeoaUFOtwkR0drHLD74hVUcRhvos4TRtD3zldhgBa3yB2ngUtxpjVmHmPuK32tNFNr7wSOFYacXkVIC84M7bmCoqLkRRGOrpu3EfJ3oDcGBF6cRWA+ZJzZiscbcp9dkhsSq0/gmiXxTQiTZvELGnjFESdzbZRPD6s8GVSewD66NZy0m7QTX/3EyfbUD0EEAvBWzSWzIUf+bumNP1ZLaMkrDmcuI6H+Q/6pEbiIeUIKV4FruNguAFNKcrUSlHIOMVrHVEmmUS/wVcPjtgi1kkxBU/SZw2Ocs7vbGMnRmI5DNHWz310EdOIu3yYyqwKnilmGe5r9gvhvT9ltN99OtI24vtMowp88KwT8U0rietb5Mam2iFohY8yIHBMhyrSvaE0gM8PMheKXKWrEWtjM6REA1eXrlDkcu1qLDDjvhSdCYxdrf3HhtxWPuSKjl+J5h4qnX555XgjUFojJXQHNooFA+uP8kQS91QOMq+SrUfZu0TrNhUiRaQzc9YYtGRUZGCsYONZppOqksKzLeMDz/tqb0aG8VPffbOXYiqE3/v72y9fOcvIUsDoPjVg1ZCys4fPuY9ySatpIaZt48/fftW+8PNhtYHoUBWUUx4JEbN2agy0R+8on8Rfnz7+Mfd2x4qpNOBTuWoqQmiszo/GImerRwcHR6uMLxror2OaY0iF4dyloSlQ1PK4+v5unNfSo1k0RNW7hGNYaOBhfRBxUA/zhkKpYR4OHUuhWZNzOiYn+HU4Hg9f84kk6nOTlmuYP4Rqp1AK6WDTLc0tI7m0YJoLS0mKi+e2KZimkUEEqqG+zxlDdgs/6W33GDRhJLrhae894S1OekJ99dR5PWp+ob7M+OxKm5xIsgnbVmY5W3Zey/WMqxz2Z6lzCdsuS6v2lcTSZbbjLpLtV2bE5tS3M+8bElNqDLhUzGf/1zaRnXdnyD/svQyE3KA65EMDL69j9l/cXHSNdKRow5FUx0jXRcnwAvgbPKigkN8EiRoAAAAASUVORK5CYII=";

const ICON_FACEBOOK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAqCAMAAAFuLbL8AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGbUExURQAAAGKHxFV9v0hzutbe71R9wVR5wlN7vkp1ukR3uwAA/1R+w1B/wn2azlR7vsDO55Sp1lZ/wcHP50x3u1N7vsLQ6FV+xAD//6m93qm933SUy5yz2uzx+FqAwFVVqk12u2iLxmSFxE53vOns9lJ6vlJ6vE94vE94vVJ7vVN8v1B5vVJ6vlJ7vlF6vVJ7vvv7/lN8v1N8wFJ6vlR9wFR9wVR9wlR7vUdzuv39/lV+wVV+wtHY7lV+w8nV61+DwlZ/w1Z/xFZ/xVJ5vf///4Oc0FN6vlR7vlR7v1N7v6S53Udxuq294FN8wEhyus3Z7Ium01R7vlZ9v0lzuqa73VN8vEp0ulJ7vUp0u1J4u3KTygAAAFh/wFJ8wPP0+ubq9nyYzkx2u013vFN6vHqUzE54vFN8vlJ8v1J8v1R/uJ2z2u3x+FuAwQB/f1J7vfv8/sbT6e7y+ai53o6l01J6vfD0+V6DwlF5vVN7wERvuFaAxFaAxVaAxlJ6vVJ6voik0lN7vlN7v1J6vW6QyVR8vlR8v1N6vVR8wFN6vVN6vsV3exUAAACJdFJOUwD/////5RV6/w8B+Sb/Y///Mv8epf/9Af///////wP//////9C9//+I3P/Y5P//////Zv///23///////////////////////j////D////cv///3f/Pv8i/wH/Sv//////d///vXXkEv///wLN///////3////9////////////4X///+6//v78Fr6zQAAAAlwSFlzAAAXEQAAFxEByibzPwAAAvxJREFUOE91lQlbUlEQhqcFTTDL3KLFytAk1BDBkiy1U0qlZUSGS2WWQCZtloZGg4nKz27mztwrkL3Pw7nffHc4nHUAgOVlagAJgGbMIzZDgB8B2wQoFrltx3aANFlpemHojbQ5jGMOIIUpTnLxd9DFkoWhDOpC5Ct+QB01ebaxjpKGWeAw5wM0IjZaYrXAbmGVpPWeAGil9rQ5htgq/Z20bPo8N+a9SjSz3MKILUeghtp4LzU1AN30ILr5N9rCiOE2VkxiS17hVkIdcJfUEkpuNgeDEvW+8Xo7WAQHAZLWcHla5vYzkYUkrIn63WLMk5ZFCdZAv7/eYcyfa6IxCA2qqAdrAkwDQFYUuedEYZYHMd2vkdA/zSaxMKoO4uiCekymtgexpzajIZP00/SZsD+pFixtisVsLom3vaeGxd42ezNDGipDM7RYHg3uPfQ+tYTHDSFLID64YUyLyBDsi8Afxrw7KnIfBkSweV3lgG79pZbPxpz5IIFsMm2oYe5LYJvYddGYE30awIQK6rNL5QREVZWZUdhVVWbuQtOYqLuOOdYE0CmyLx4XgZ20IHMxDZTYHC8TbGhosWFZxKQ9BIxOqkXU+yJ0iAoRX70aDm31KV84UpQjVihGwr5UvXNsy1iYHHV6doiOTpYfBKZ7Q+7cvwxvWBdDmJuOVZ6ySvpj0zJJqOnMqaf0vY0Ti+MaIuY66eoBNGV1RZVf81+v8i7euakGMZalNa7b5et7QP7ja8679ekUXX6Hkd06aKiacZ520Jhv6xraRBsgYJ8GZqdj6tE4Z17+ObW4o6bFRMC+oEL8LKcJj1+qKQTtUye8OL+y8oXTvl84fqVqAHYpcJBxztqHzWENmu2boPwnc6AZkvtadZTDMwv7dL1DXDoPODyzNUR75B70lM8/P+8ljlRMJ+gZtCohzKSr6kAVQ2mqC4J7u1RRRyrYK21Lh8LqkmuzcmZCYdO1xH8IFSQT/i0tZEp4y59wKlol7ZnG2mWqhETPcm1jhv7ObAD+An13YqOaVniIAAAAAElFTkSuQmCC";

const ICON_WEB =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAsCAMAAAG8gYHcAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJJUExURQAAAFG9kVG9klS+klO9ksrn2Em6jYrRsVK+klfFmLviz7vi0Ob07VjGmVW+kcTm1YzTte/481O8kdbu41XBlcXn12LCmo3UuFG7j7TgzYHLqlbCllO+lIvQslO9knrJp1zBmFS+klS+k0zMmdbs4FW/lN/w52vEnVO9koXPr028jk28j+j07VG8k9ft4mPBmvH49H3Mq2zFn/r8+nXJpfL59X7Nq/L59vv9+9Dr4Fy/ler28K7dyNnv5bfhzl3AmFS+ksHm1n//f4bOrle/lU+8j1S8ktHq3VC9kFC9kVC9klO9lG/GotLr31G+kez28FG+kjPMZtvv5VO9k1O/kvX69+Tz6/7+/l/AmGjEnY/Qs1O+kv///1O9k93x51jHmlO+koDLqVG8kJLTtlrAllbDl4rQsVK9kFK9klvBl7rgzFS+kkq6jVS9klO+klO+k1jFmVS/k1S/lFS9kWrEnFS+ks3p3Pj7+VvIkVXAlGLBmvD4843Tt2vFnN/x6GvFnWvFn/n8+lX/quj17lS9kla9klTAk1O8kFS+k1DAj1S9k3vJp9Ht4lbEmFW+k3zKp1Wqf1S+kVO7k027jk27j33LqODw5lfCk068j1O9klfAldDq3dDq3k+9kWXCmWXCmvP59n/NrG7GoPz9/F2/luv28drv5YDOrv3+/V7Al4nStFS+lOT067niz+T07F/Bl1W/lE66jVS8kVe+lGDCmlO9k4fOrlXDlrLgzE+/j1C5kVO+lJnWulC8j4jPsHfIpFC8kZHTt9Lq3SRqe9IAAAC8dFJOUwD//4v6////////////M////73///////////9u////////Cv/////0/////zL////////////////////////W/wL///9n/////yv//////wX/24T////////B/+P//5v/////////////xf/n//////9t/83//w7///////////8D/3Uvfv+vKf////3//wblQP////8m/5kp/////////////////////+L/////DP8q///E//f/EDOPqtlzWQAAAAlwSFlzAAAXEQAAFxEByibzPwAAA9JJREFUOE99lP1DFGUQx2dDEzLIaM30KHXojCx8SS2NSkRFL6REkEQGD5Uzi7iDRZIrM0MgsFDejJestCxTKi+CCOjF+sucmX1u78Xq88M+M9+dfXZ2dp4BgKomvgAyAHmIXw8hLMD1JC6eQ+wGmEWs05h2gDGO83P0M9cQcKlEYTgisX65ANTLRmhruLDwAOIEtLBV9E8mhyOMI9I7L+hNgF5dEX3yALQ3YZUaALbK9WLyzsoYwISsF+iiPCpm5ATynnliB+jZ8s2ILWzvp+20gqUFbK9d/OMxiRyHbsRVDWJKnj41EHvlBXVi+WfFFLoKHL0HTkGXkQAa41ko/kYVy0LG50ykCoihMoCYmzszuuGb5afX7GXLjkGlq2Fgx+uf/mKtuzoqTqVbJbSq6eZbu96lS66L0CPXIVoUOfnYqd0qMT3QkS3rcXqDDuv7hOwOTmXGOB4zmiHkNBtfac5xVWFuICpSdGDOCC79g9MOOtOD/cYXSuaz9HHErPkSo8FkvIaCb9IVCxMVEUKFIsb6jBunL8ZqsXGYcFiXYoARr3aZl4l2im6PQJsrMU/Ty9ton1htpkWYL/545b7hTWfEtLXVhA+qH3w8XEM3xJamUI7Stx89f4jOBtQz6kq6Eml4j867olFvU7n1ANEPd9RjVXti2dZRfPPFU6+qxA0CWsJbdP1L+tv7H1HolMU6SLRFBaUTKoJqTE2t1lUIVgCUet9hsEulaLkpDYf+XBEBak1vKk6tKwK0unsLwVajMfkZtsQ7dka+URLkz2UM2NH4dk7UHsiYuzeKmW2tC6YmI/iDda3ekTHk1DYnp5eM01yb1HvQm+u7d8sEfl+unkyhdCa9QOnYM1oxqOhOVMEjsrph6tzUKnRbjAl2c9E7OvUgpRDBw1uITxYdPG4ZCbM7O2Bcf3Iqw0sepoe+uv/6YqJba42G0XHoSf/+wO6/fv3k459P8jBYtJWWDRkZnR6esincWfETCU8+aq0vJ1p6e7+54Q6yJAKXzhN9/tSu52peu3mFqHqll67gnQAmsPksUfmhzI2f7Xm7iKjoqOlxQwtUesGjN67SuhoLn6j57ZEjR3Z8mBqJLZWQ5/2HoTO06dowWttf+v1YwPIaP46dB7G2ePDefWvo9Lbl331P7/8pkzAVu41HwchEPDh8cecBLsHCyxcyjZLAnhiRn1xWnDx0w+7YTSNUzGNYiI31/V+bcaP1jckscilsDP13tD/UqMPMY7Le9++NafvqzTRMoqRrviArtTmcrIL5Lm+cptHfPlg13aSHt2m6arA9eRwD3AX4P2Mxj4sOCwAAAABJRU5ErkJggg==";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSignatureHtml(
  userData: SignatureUserData,
  template: SignatureTemplateData
): string {
  const u = userData;
  const t = template;

  // Build social icons HTML (using fixed base64 icons from firma.html)
  // NOTE: img must have display:inline-block because Tailwind preflight sets img{display:block}
  const socialIcons: string[] = [];
  if (t.showInstagram && t.instagramUrl) {
    socialIcons.push(`<a href="${escapeHtml(t.instagramUrl)}" style="display:inline-block;text-decoration:none;"><img src="${ICON_INSTAGRAM}" style="display:inline-block;width:20px;height:20px;vertical-align:middle;"></a>`);
  }
  if (t.showFacebook && t.facebookUrl) {
    socialIcons.push(`<a href="${escapeHtml(t.facebookUrl)}" style="display:inline-block;text-decoration:none;"><img src="${ICON_FACEBOOK}" style="display:inline-block;width:20px;height:20px;vertical-align:middle;"></a>`);
  }
  if (t.showWeb && t.webLinkUrl) {
    socialIcons.push(`<a href="${escapeHtml(t.webLinkUrl)}" style="display:inline-block;text-decoration:none;"><img src="${ICON_WEB}" style="display:inline-block;width:20px;height:20px;vertical-align:middle;"></a>`);
  }
  const socialHtml = socialIcons.join("&nbsp;");

  const logoHtml = t.logoUrl
    ? `<img alt="" src="${t.logoUrl}" style="width: 160px; height: 64px;">`
    : "";

  const bannerHtml = t.bannerUrl
    ? `<img src="${t.bannerUrl}"/>`
    : "";

  const disclaimerHtml = t.disclaimerLang === "en" ? (t.footerEn || "") : (t.footerIt || "");
  const ecoText = t.ecoText || "";

  const websiteHtml = t.websiteUrl && t.website
    ? `<h3><a href="${escapeHtml(t.websiteUrl)}">${escapeHtml(t.website)}</a></h3>`
    : "";

  return `<html>
<body>
<style type="text/css">
body {
font-family: Trebuchet MS, sans-serif;
color: black;
}
h1 {
font-size: 14pt;
font-weight: normal;
color: #8f929b;
padding: 0px 0px; margin: 0px 0px 0px 0px;
}
h2 {
font-size: 10pt;
font-weight: normal;
color: #e06b0a;
padding: 0px 0px; margin: 0px 0px 0px 0px;
}
h3 {
font-size: 9pt;
font-weight: normal;
color: #8f929b;
padding: 0px 0px; margin: 0px 0px 0px 0px;
}
h3 a{
color: #e06b0a;
}
h3 a:visited{
color: #8f929b;
}
h3 a:link{
color: #8f929b;
}
h4 {
font-size: 9pt;
font-weight: normal;
color: #228b22;
padding: 0px 0px; margin: 0px 0px 0px 0px;
}
h4 a{
color: #e06b0a;
}
h4 a:visited{
color: #e06b0a;
}
h5 {
font-size: 6pt;
font-weight: normal;
color: #8f929b;
padding: 0px 0px; margin: 0px 0px 0px 0px;
}
h5 a{
color: #e06b0a;
}
h5 a:visited{
color: #e06b0a;
}
#image_cell{
width:150px;
}
</style>
<table border="0" cellspacing="0" cellpadding="0" style="white-space: normal; width:530px;">
<tr>
\t<td colspan="2"><h1>${escapeHtml(u.fullName)}</h1>
\t<h2>${escapeHtml(u.department)}</h2>
        </td>
</tr>
<tr>
        <td colspan="2" >
\t<p style="margin-top: 10px;">
\t<h3>${escapeHtml(u.infoLine1)}<h3/>
\t<h3>${escapeHtml(u.infoLine2)}<h3/>
\t<h3>${escapeHtml(u.address)}</h3>
\t<h3>${escapeHtml(u.phone)}</h3>
\t${websiteHtml}
\t<h5>&nbsp</h5></p>
\t</td>
</tr>
<tr>
\t<td style="width: 160px; border-top: 2px solid orange;  border-bottom: 2px solid orange;">
\t${logoHtml}
<div style="margin-top: 6px; white-space: nowrap; text-align: center;">${socialHtml}</div>
</td>\t
\t<td style="width: 600px; border-top: 2px solid orange;border-bottom: 2px solid orange;">
\t\t${bannerHtml}
</tr>
<tr>
\t<td colspan="2">
\t\t<p style="margin-top: 5px;"><h5>${disclaimerHtml}</h5>
\t\t<h4>${ecoText}</h4></p>
\t</td>
</tr>
</table>
</body>
</html>`;
}
