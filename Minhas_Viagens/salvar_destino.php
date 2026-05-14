<?php
// salvar_destino.php — usa conexão unificada (shared/conexao.php)
require_once __DIR__ . '/../shared/conexao.php';

$cidade    = $_POST['cidade']     ?? '';
$descricao = $_POST['hospedagem'] ?? '';
$hospedes  = $_POST['hospedes']   ?? '';
$dias      = $_POST['dias']       ?? '';
$cep       = $_POST['cep']        ?? '';
$status    = $_POST['status']     ?? '';

// Tratamento da foto
$fotoNome = null;

if (!empty($_FILES['foto']['name'])) {
    $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
    $permitidas = ['jpg', 'jpeg', 'png'];

    if (!in_array($ext, $permitidas)) {
        die("Formato de imagem inválido. Use JPG ou PNG.");
    }

    $fotoNome = uniqid("img_") . "." . $ext;
    move_uploaded_file($_FILES['foto']['tmp_name'], "uploads/" . $fotoNome);
}

$stmt = $pdo->prepare("INSERT INTO pontos_turisticos 
    (cidade, descricao, hospedes, quartos, cep, imagens, status)
    VALUES (:cidade, :descricao, :hospedes, :quartos, :cep, :imagens, :status)");

$stmt->execute([
    ':cidade'    => $cidade,
    ':descricao' => $descricao,
    ':hospedes'  => $hospedes,
    ':quartos'   => $dias,
    ':cep'       => $cep,
    ':imagens'   => $fotoNome,
    ':status'    => $status,
]);

header("Location: minhas_viagens.php");
exit;
