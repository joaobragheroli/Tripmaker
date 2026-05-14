<?php
// excluir_destino.php — usa conexão unificada (shared/conexao.php)
require_once __DIR__ . '/../shared/conexao.php';

if (!isset($_GET['id'])) {
    die("ID inválido.");
}

$id = intval($_GET['id']);

// Busca foto para remover
$busca = $pdo->prepare("SELECT imagens FROM pontos_turisticos WHERE id = ?");
$busca->execute([$id]);
$foto = $busca->fetchColumn();

if ($foto && file_exists("uploads/" . $foto)) {
    unlink("uploads/" . $foto);
}

// Deleta do banco
$delete = $pdo->prepare("DELETE FROM pontos_turisticos WHERE id = ?");
$delete->execute([$id]);

header("Location: minhas_viagens.php");
exit;
