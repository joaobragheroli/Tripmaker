<?php
// ============================================================
// shared/conexao.php — Conexão única para todo o projeto
// Uso: require_once __DIR__ . '/../shared/conexao.php';
// Disponibiliza a variável $pdo (PDO) para os scripts que incluírem este arquivo.
// ============================================================

$host   = getenv('DB_HOST')     ?: 'localhost';
$banco  = getenv('DB_NAME')     ?: 'turismo';
$usuario = getenv('DB_USER')    ?: 'root';
$senha  = getenv('DB_PASS')     ?: '';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$banco;charset=utf8mb4",
        $usuario,
        $senha,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['erro' => 'Falha na conexão com o banco de dados.']));
}
