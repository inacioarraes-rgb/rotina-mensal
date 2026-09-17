# Rotina Mensal

Site estático/PWA para acompanhamento mensal de tarefas.

## Publicar no GitHub Pages

1. Envie **todos os arquivos da raiz deste pacote** para a raiz do repositório `rotina-mensal`.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Branch: `main`.
5. Pasta: `/ (root)`.
6. Clique em **Save**.

Depois de alguns instantes, o endereço será normalmente:

`https://inacioarraes-rgb.github.io/rotina-mensal/`

## Perfis

O site possui dois perfis locais:
- Camille
- Inácio

Os dados são separados por usuário no navegador usando `localStorage`.

> Importante: por ser um site estático, dados não sincronizam entre aparelhos diferentes.


## Atualização v3

Esta versão usa arquivos versionados (`?v=3`) para impedir que celulares continuem usando JavaScript ou CSS antigos em cache.

Ao substituir os arquivos no GitHub Pages, aguarde o deploy e abra o site novamente.


## v4
No celular, o mapa de execução do Dashboard voltou ao formato de grade única, com rolagem horizontal e a coluna de nomes das tarefas fixa.
