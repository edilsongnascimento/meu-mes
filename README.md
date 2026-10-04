# Meu Mês

Aplicativo de controle de ganhos e despesas, instalável como PWA.

## Publicação

O projeto pode ser hospedado gratuitamente no GitHub Pages. O workflow publica os arquivos estáticos a cada atualização da branch `main`. Na primeira publicação, abra **Settings > Pages** no GitHub e selecione **GitHub Actions** como origem de build/deploy, se ainda não estiver selecionada.

O site ficará disponível em `https://edilsongnascimento.github.io/meu-mes/`. O app não envia lançamentos para o GitHub: os dados permanecem no navegador ou no arquivo JSON de backup escolhido pelo usuário.

## Proteção dos dados

- Os lançamentos são salvos automaticamente no armazenamento local do navegador (IndexedDB, além do `localStorage` legado).
- Para manter uma cópia fora dos dados do Chrome, use **Criar/vincular arquivo JSON** e escolha onde salvar `meu-mes-backup.json`. Depois de concedida a permissão, alterações nos lançamentos atualizam esse arquivo.
- Se o Chrome pedir novamente a permissão do arquivo, use **Permitir acesso ao arquivo**.
- Depois de limpar os dados do site ou reinstalar o app, use **Restaurar arquivo JSON** e selecione o backup. A restauração substitui os lançamentos atuais e volta a vincular o arquivo para salvamento automático.
- Acesso automático ao arquivo depende de um navegador compatível, como o Chrome, e de uma origem segura (HTTPS ou `localhost`). Em navegadores sem essa função, o botão baixa um arquivo JSON; nesse caso, novos backups precisam ser baixados manualmente.

O arquivo de backup não é criptografado. Guarde-o em um local privado e confiável.
