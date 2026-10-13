#!/usr/bin/env node
import { ICON_URLS } from '../src/icon-sources.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const candidates = [
  ['Mozilla.Firefox', 'https://www.mozilla.org/media/img/favicons/favicon-32x32.png'],
  ['VideoLAN.VLC', 'https://www.videolan.org/favicon.ico'],
  ['7zip.7zip', 'https://www.7-zip.org/favicon.ico'],
  ['BlenderFoundation.Blender', 'https://www.blender.org/favicon.ico'],
  ['Mojang.MinecraftLauncher', 'https://www.minecraft.net/favicon.ico'],
  ['GIMP.GIMP', 'https://www.gimp.org/favicon.ico'],
  ['Inkscape.Inkscape', 'https://inkscape.org/favicon.ico'],
  ['Audacity.Audacity', 'https://www.audacityteam.org/favicon.ico'],
  ['Shotcut', 'https://shotcut.org/favicon.ico'],
  ['Kdenlive', 'https://kdenlive.org/favicon.ico'],
  ['OBSProject.OBSStudio', 'https://obsproject.com/favicon.ico'],
  ['Cisco.Webex', 'https://www.webex.com/favicon.ico'],
  ['GitHub.GitHubDesktop', 'https://desktop.github.com/favicon.ico'],
  ['Microsoft.PowerToys', 'https://powertoys.microsoft.com/favicon.ico'],
  ['Microsoft.Edge', 'https://www.microsoft.com/en-us/edge/favicon.ico'],
  ['Microsoft.Teams', 'https://teams.microsoft.com/favicon.ico'],
  ['Microsoft.OneDrive', 'https://onedrive.live.com/favicon.ico'],
  ['Microsoft.PowerShell', 'https://learn.microsoft.com/favicon.ico'],
  ['Ecosia.EcosiaBrowser', 'https://www.ecosia.org/favicon.ico'],
  ['AutoHotkey.AutoHotkey', 'https://www.autohotkey.com/favicon.ico'],
  ['Adobe.Acrobat.Reader.64-bit', 'https://acrobat.adobe.com/favicon.ico'],
  ['AnyDesk.AnyDesk', 'https://anydesk.com/favicon.ico'],
  ['SumatraPDF.SumatraPDF', 'https://www.sumatrapdfreader.org/favicon.ico'],
  ['Clementine.Clementine', 'https://clementine-player.org/favicon.ico'],
  ['ch.LosslessCut', 'https://mifi.github.io/lossless-cut/favicon.ico'],
  ['yt-dlp.yt-dlp', 'https://github.com/yt-dlp/yt-dlp/raw/master/yt-dlp.png'],
  ['Node.js', 'https://nodejs.org/favicon.ico'],
  ['Docker.DockerDesktop', 'https://www.docker.com/favicon.ico'],
  ['Notion.Notion', 'https://www.notion.so/favicon.ico'],
  ['Obsidian.Obsidian', 'https://obsidian.md/favicon.ico'],
  ['Bitwarden.Bitwarden', 'https://bitwarden.com/favicon.ico'],
  ['Verbal', 'https://verbal.klip.app/favicon.ico'],
  ['Discord.Discord', 'https://discord.com/favicon.ico'],
  ['Signal', 'https://signal.org/favicon.ico'],
  ['Spotify.Spotify', 'https://spotify.com/favicon.ico'],
  ['Valve.Steam', 'https://store.steampowered.com/favicon.ico'],
  ['Epic', 'https://www.epicgames.com/favicon.ico'],
  ['Parsec', 'https://parsec.app/favicon.ico'],
  ['KDE.Krita', 'https://krita.org/favicon.ico'],
  ['DigitalScholar.Zotero', 'https://www.zotero.org/favicon.ico'],
  ['Joplin.Joplin', 'https://joplinapp.org/favicon.ico'],
  ['Element.Element', 'https://element.io/favicon.ico'],
  ['StandardNotes.StandardNotes', 'https://standardnotes.com/favicon.ico'],
  ['Okta.OktaVerify', 'https://okta.com/favicon.ico'],
  ['NickeManarin.ScreenToGif', 'https://www.screentogif.com/favicon.ico'],
  ['DuongDieuPhap.ImageGlass', 'https://imageglass.org/favicon.ico'],
  ['FlorianHeidenreich.Mp3tag', 'https://www.mp3tag.de/favicon.ico'],
  ['Elsevier.MendeleyReferenceManager', 'https://www.mendeley.com/favicon.ico'],
  ['RARLab.WinRAR', 'https://www.win-rar.com/favicon.ico'],
  ['ONLYOFFICE.DesktopEditors', 'https://www.onlyoffice.com/favicon.ico'],
  ['Windscribe.Windscribe', 'https://windscribe.com/favicon.ico'],
  ['Figma.Figma', 'https://www.figma.com/favicon.ico'],
  ['DuckDuckGo.DesktopBrowser', 'https://duckduckgo.com/favicon.ico']
];

const ok = [];
const bad = [];
for (const [id, url] of candidates) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': UA } });
    const type = res.headers.get('content-type') || '';
    const good = res.ok && (type.startsWith('image/') || type === '');
    (good ? ok : bad).push(`${good ? 'OK  ' : 'BAD '} ${String(res.status).padEnd(4)} ${type.padEnd(26).slice(0, 26)} ${id.padEnd(36)} ${url}`);
  } catch (e) {
    bad.push(`ERR  --- ${String(e.message).slice(0, 40).padEnd(26)} ${id.padEnd(36)} ${url}`);
  }
}
console.log(`=== OK (${ok.length}) ===`);
console.log(ok.join('\n'));
console.log(`\n=== REJECTED (${bad.length}) ===`);
console.log(bad.join('\n'));
console.log(`\nsrc/icon-sources.js currently pins ${Object.keys(ICON_URLS).length} ids`);