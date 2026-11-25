# Estuda+ — Organização de estudos

Projeto acadêmico com início, planejador de tarefas e página sobre o site.

**Aluno e único integrante:** Richard Coelho Rodrigues  
**Disciplina:** Desenvolvimento Web  
**Professor:** Gabriel Carvalho

O site permite cadastrar, editar, excluir, concluir e reabrir atividades de estudo. Também oferece busca, filtro de situação, contadores, barra de progresso e exportação em texto. O visual usa tons de azul e se adapta a telas menores.

## Como executar

1. Use PHP 8 com o driver `pdo_sqlite` habilitado. Confira com `php -m`.
2. No terminal, entre na pasta do projeto, que contém a pasta `public`.
3. Execute `php -S 127.0.0.1:8000 -t public`.
4. Abra http://127.0.0.1:8000 e acesse Minhas tarefas.

O arquivo `dados/estuda.sqlite` é criado automaticamente. A pasta do banco fica fora da raiz pública e é ignorada pelo Git. As tarefas salvas na versão anterior pelo navegador não são importadas automaticamente. O botão Exportar .txt guarda uma cópia para leitura.

No PowerShell, se o PHP estiver instalado pelo XAMPP e o comando `php` não for reconhecido, use o caminho do executável:

```powershell
& "C:\xampp\php\php.exe" -S 127.0.0.1:8000 -t public
```

Esse caminho é um exemplo: confira onde o PHP está instalado no seu computador. Para testar a extensão, execute `php -m` ou `& "C:\xampp\php\php.exe" -m` e verifique se aparece `pdo_sqlite`.

O planejador precisa de um servidor PHP. Abrir o HTML diretamente ou usar apenas um servidor de arquivos estáticos não executa a API.

## Tecnologias

- HTML semântico para páginas, navegação e formulário.
- CSS separado para a paleta azul e o layout responsivo.
- JavaScript para validação, interações, busca, filtros e chamadas com fetch.
- PHP e PDO para validar as requisições e executar consultas preparadas no SQLite.

## Operações do planejador

| Ação | Requisição | SQL |
| --- | --- | --- |
| Listar | GET | SELECT |
| Cadastrar | POST | INSERT |
| Editar | PUT | UPDATE |
| Concluir ou reabrir | PATCH | UPDATE |
| Excluir | DELETE | DELETE |

## Organização dos arquivos

| Arquivo | Função |
| --- | --- |
| `public/index.html` | Apresentação do site e materiais de estudo |
| `public/tarefas.html` | Formulário e lista de tarefas |
| `public/sobre.html` | Informações sobre o projeto |
| `public/style.css` | Estilos e layout responsivo |
| `public/script.js` | Interações e chamadas à API |
| `public/api.php` | Validação e operações no banco via PDO |
| `dados/estuda.sqlite` | Banco criado automaticamente na execução |

## Desenvolvimento

Trabalho individual, com apoio de inteligência artificial na elaboração e revisão do código e em orientações de configuração. As fotos da página inicial são carregadas do Unsplash; se o serviço não estiver disponível, o layout mantém um fundo azul. Os créditos estão no rodapé.

O projeto é uma demonstração acadêmica local, sem cadastro ou autenticação de usuários.
