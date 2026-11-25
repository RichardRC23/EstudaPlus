<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function responder(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function lerJson(): array
{
    $tipo = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($tipo !== 'application/json') {
        responder(['erro' => 'Envie os dados no formato JSON.'], 415);
    }

    $corpo = file_get_contents('php://input', false, null, 0, 16385);
    if ($corpo === false || strlen($corpo) > 16384) {
        responder(['erro' => 'O conteúdo da requisição é muito grande.'], 413);
    }

    try {
        $dados = json_decode($corpo, true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException $erro) {
        responder(['erro' => 'O JSON recebido é inválido.'], 400);
    }

    if (!is_array($dados)) {
        responder(['erro' => 'Informe os dados da tarefa.'], 400);
    }

    return $dados;
}

function camposDaTarefa(array $dados): array
{
    $titulo = is_string($dados['titulo'] ?? null) ? trim($dados['titulo']) : '';
    $materia = is_string($dados['materia'] ?? null) ? trim($dados['materia']) : '';
    $prazo = $dados['prazo'] ?? '';
    $prioridade = $dados['prioridade'] ?? '';

    if (!preg_match('/\A.{3,80}\z/u', $titulo)) {
        responder(['erro' => 'O título deve ter entre 3 e 80 caracteres.'], 422);
    }
    if (!preg_match('/\A.{1,40}\z/u', $materia)) {
        responder(['erro' => 'A matéria deve ter entre 1 e 40 caracteres.'], 422);
    }
    if (!is_string($prazo)
        || !preg_match('/\A(\d{4})-(\d{2})-(\d{2})\z/', $prazo, $partes)
        || !checkdate((int) $partes[2], (int) $partes[3], (int) $partes[1])) {
        responder(['erro' => 'Informe um prazo válido.'], 422);
    }
    if (!in_array($prioridade, ['normal', 'alta', 'baixa'], true)) {
        responder(['erro' => 'Escolha uma prioridade válida.'], 422);
    }

    return compact('titulo', 'materia', 'prazo', 'prioridade');
}

function listarTarefas(PDO $banco): array
{
    $resultado = $banco->query(
        'SELECT id, titulo, materia, prazo, prioridade, concluida
         FROM tarefas ORDER BY concluida, prazo, id'
    );

    return array_map(static function (array $tarefa): array {
        $tarefa['id'] = (string) $tarefa['id'];
        $tarefa['concluida'] = (int) $tarefa['concluida'] === 1;
        return $tarefa;
    }, $resultado->fetchAll());
}

try {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if (!in_array($metodo, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        header('Allow: GET, POST, PUT, PATCH, DELETE');
        responder(['erro' => 'Método não permitido.'], 405);
    }

    if ($metodo === 'PUT' || $metodo === 'PATCH' || $metodo === 'DELETE') {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($id === false) {
            responder(['erro' => 'Informe um identificador válido.'], 400);
        }
    }

    if (!class_exists(PDO::class) || !in_array('sqlite', PDO::getAvailableDrivers(), true)) {
        responder(['erro' => 'Ative a extensão pdo_sqlite no PHP.'], 500);
    }

    // O banco fica em dados/, fora da pasta public/.
    $pasta = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'dados';
    if (!is_dir($pasta) && !@mkdir($pasta, 0700, true) && !is_dir($pasta)) {
        throw new RuntimeException('Não foi possível criar a pasta do banco.');
    }

    $banco = new PDO('sqlite:' . $pasta . DIRECTORY_SEPARATOR . 'estuda.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $banco->exec('PRAGMA busy_timeout = 3000');
    $banco->exec(
        "CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            materia TEXT NOT NULL,
            prazo TEXT NOT NULL,
            prioridade TEXT NOT NULL CHECK (prioridade IN ('normal', 'alta', 'baixa')),
            concluida INTEGER NOT NULL DEFAULT 0 CHECK (concluida IN (0, 1))
        )"
    );

    if ($metodo === 'GET') {
        responder(['tarefas' => listarTarefas($banco)]);
    }

    if ($metodo === 'POST') {
        $campos = camposDaTarefa(lerJson());
        $consulta = $banco->prepare(
            'INSERT INTO tarefas (titulo, materia, prazo, prioridade)
             VALUES (:titulo, :materia, :prazo, :prioridade)'
        );
        $consulta->execute($campos);
        responder(['tarefas' => listarTarefas($banco)], 201);
    }

    if ($metodo === 'PUT') {
        $campos = camposDaTarefa(lerJson());
        $campos['id'] = $id;
        $consulta = $banco->prepare(
            'UPDATE tarefas SET titulo = :titulo, materia = :materia, prazo = :prazo,
             prioridade = :prioridade WHERE id = :id'
        );
        $consulta->execute($campos);
    } elseif ($metodo === 'PATCH') {
        $dados = lerJson();
        if (!is_bool($dados['concluida'] ?? null)) {
            responder(['erro' => 'Informe se a tarefa foi concluída.'], 422);
        }
        $consulta = $banco->prepare('UPDATE tarefas SET concluida = :concluida WHERE id = :id');
        $consulta->execute(['concluida' => (int) $dados['concluida'], 'id' => $id]);
    } else {
        $consulta = $banco->prepare('DELETE FROM tarefas WHERE id = :id');
        $consulta->execute(['id' => $id]);
    }

    if ($consulta->rowCount() === 0) {
        responder(['erro' => 'Tarefa não encontrada. Atualize a página.'], 404);
    }

    responder(['tarefas' => listarTarefas($banco)]);
} catch (Throwable $erro) {
    error_log($erro->getMessage());
    responder(['erro' => 'O servidor não conseguiu acessar o banco de dados.'], 500);
}
