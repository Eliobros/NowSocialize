# MediaMTX ↔ SocializeNow (v1.21.4)

Arquitetura: o OBS publica com a **chave secreta** em `live/<streamKey>`, e os
espectadores assistem pelo **id público** em `public/<liveId>/index.m3u8`. A
chave nunca aparece no browser. Uma ponte `ffmpeg` (só repasse, `-c copy`, sem
re-encode) liga os dois paths dentro do MediaMTX.

## Instalação na VPS

```bash
sudo cp mediamtx/on-online.sh mediamtx/on-offline.sh /usr/local/etc/mediamtx/
sudo chmod +x /usr/local/etc/mediamtx/on-online.sh /usr/local/etc/mediamtx/on-offline.sh
sudo cp mediamtx/live.env.example /usr/local/etc/mediamtx/live.env
sudo chmod 600 /usr/local/etc/mediamtx/live.env
sudo nano /usr/local/etc/mediamtx/live.env   # preencher (ver abaixo)
```

Pré-requisitos no host: `ffmpeg` instalado (`ffmpeg -version`) e o app
SocializeNow a correr na mesma máquina (o auth é em `127.0.0.1:3002`).

## Sincronizar segredos (3 valores, 2 ficheiros)

| `/usr/local/etc/mediamtx/live.env` | `.env` do app |
|---|---|
| `MEDIA_SECRET` | `MEDIA_SERVER_SECRET` (mesmo valor) |
| `MTMX_BRIDGE_USER` | `MTMX_BRIDGE_USER` (mesmo valor) |
| `MTMX_BRIDGE_PASS` | `MTMX_BRIDGE_PASS` (mesmo valor) |

## Configurar o mediamtx.yml

Fundir o bloco de [paths-config.yml](./paths-config.yml) no
`/usr/local/etc/mediamtx/mediamtx.yml` e reiniciar:

```bash
sudo systemctl restart mediamtx   # ou reiniciar o processo
```

Notas:

- Com `authMethod: http`, o bloco `authInternalUsers` fica inativo: todas as
  regras (publish com chave, leitura aberta em `public/*`, ponte com credencial)
  vivem no `POST /api/live/mtmx-auth`.
- `runOnOnlineRestart: true`: se o ffmpeg cair por erro transitório, o MediaMTX
  rearranca a ponte sozinho. Quando o OBS para, o MediaMTX manda SIGINT ao
  ffmpeg (não é preciso matar processos à mão).

## Nginx (HLS por HTTPS)

O app monta o player como `https://media.eliobrostech.site/public/{liveId}/index.m3u8`.
O nginx precisa de repassar esse prefixo ao HLS do MediaMTX (`:8888`):

```nginx
location /public/ {
  proxy_pass http://127.0.0.1:8888/public/;
  proxy_http_version 1.1;
}
```

(O `.m3u8` referencia os segmentos com URLs relativas, por isso o mesmo prefixo
serve a playlist e os `.ts`.)

## Fluxo completo

1. Streamer cria a live no app → recebe servidor RTMP + `streamKey`.
2. OBS (Transmissão → Personalizado): servidor `rtmp://media.eliobrostech.site/live`,
   chave = `streamKey` → path `live/<streamKey>`.
3. MediaMTX pergunta ao `mtmx-auth`: chave válida? waiting→live (auto-start) ou
   já live → `200` (qualquer outro caso → `401`, publicação recusada na hora).
4. `runOnOnline` chama `validate-key`, recebe o `liveId` e arranca o ffmpeg
   `live/<key>` → `public/<liveId>`.
5. Espectadores assistem `https://media.eliobrostech.site/public/<liveId>/index.m3u8`.
6. OBS para → `runOnOffline` chama `publish-done` → live `ended` + evento socket.

## Limitações conhecidas (MVP)

- Fim estrito: se o OBS cair e voltar em segundos, o `runOnOffline` do intervalo
  encerra a live e a reconexão é recusada (`ended`). Evolução futura: janela de
  tolerância no `publish-done`.
- Sem gravação: `playback` segue as mesmas regras de `read`, mas nada é gravado.
- `mtmx-auth` responde sem JWT (o MediaMTX não envia um): a segurança vem do
  conhecimento da chave/ponte. Chamadas sem chave válida recebem `401` e não
  produzem nenhum efeito.
