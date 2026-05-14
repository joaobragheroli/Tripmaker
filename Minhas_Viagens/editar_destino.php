<?php
// editar_destino.php — usa conexão unificada (shared/conexao.php)
require_once __DIR__ . '/../shared/conexao.php';

$id        = intval($_POST['id']        ?? 0);
$cidade    = $_POST['cidade']           ?? '';
$descricao = $_POST['hospedagem']       ?? '';
$hospedes  = $_POST['hospedes']         ?? '';
$dias      = $_POST['dias']             ?? '';
$cep       = $_POST['cep']             ?? '';
$status    = $_POST['status']           ?? '';

// Verifica foto nova
$novaFoto = null;

if (!empty($_FILES['foto']['name'])) {
    $ext = strtolower(pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION));
    $permitidas = ['jpg', 'jpeg', 'png'];

    if (!in_array($ext, $permitidas)) {
        die("Formato de imagem inválido. Use JPG ou PNG.");
    }

    $novaFoto = uniqid("img_") . "." . $ext;
    move_uploaded_file($_FILES['foto']['tmp_name'], "uploads/" . $novaFoto);

    // Busca e remove foto antiga
    $busca = $pdo->prepare("SELECT imagens FROM pontos_turisticos WHERE id = ?");
    $busca->execute([$id]);
    $antiga = $busca->fetchColumn();

    if ($antiga && file_exists("uploads/" . $antiga)) {
        unlink("uploads/" . $antiga);
    }
}

if ($novaFoto) {
    $stmt = $pdo->prepare("UPDATE pontos_turisticos SET
        cidade = :cidade, descricao = :descricao, hospedes = :hospedes,
        quartos = :quartos, cep = :cep, status = :status, imagens = :imagens
        WHERE id = :id");

    $stmt->execute([
        ':cidade'    => $cidade,
        ':descricao' => $descricao,
        ':hospedes'  => $hospedes,
        ':quartos'   => $dias,
        ':cep'       => $cep,
        ':status'    => $status,
        ':imagens'   => $novaFoto,
        ':id'        => $id,
    ]);
} else {
    $stmt = $pdo->prepare("UPDATE pontos_turisticos SET
        cidade = :cidade, descricao = :descricao, hospedes = :hospedes,
        quartos = :quartos, cep = :cep, status = :status
        WHERE id = :id");

    $stmt->execute([
        ':cidade'    => $cidade,
        ':descricao' => $descricao,
        ':hospedes'  => $hospedes,
        ':quartos'   => $dias,
        ':cep'       => $cep,
        ':status'    => $status,
        ':id'        => $id,
    ]);
}

header("Location: minhas_viagens.php");
exit;
