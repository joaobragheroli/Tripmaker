<?php
// salvar_ponto.php — usa conexão unificada (shared/conexao.php)

ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

// Conexão via arquivo compartilhado (PDO)
require_once __DIR__ . '/../../shared/conexao.php';

// Receber dados JSON
$input = file_get_contents("php://input");
$dados = json_decode($input, true);

if (!$dados) {
    echo json_encode(["sucesso" => false, "erro" => "Nenhum dado recebido"]);
    exit;
}

// Preparar dados
$bairro          = $dados['bairro']           ?? '';
$banheiros       = intval($dados['banheiros'] ?? 0);
$cardsSelecionados = $dados['cardsSelecionados'] ?? '';
$cep             = $dados['cep']              ?? '';
$cidade          = $dados['cidade']           ?? '';
$cozinhas        = intval($dados['cozinhas']  ?? 0);
$estado          = $dados['estado']           ?? '';
$hospedes        = intval($dados['hospedes']  ?? 0);
$idAmbiente      = $dados['idAmbiente']       ?? '';
$idEspaco        = $dados['idEspaco']         ?? '';
$lat             = floatval($dados['lat']     ?? 0);
$lng             = floatval($dados['lng']     ?? 0);
$numero          = $dados['numero']           ?? '';
$quartos         = intval($dados['quartos']   ?? 0);
$rua             = $dados['rua']              ?? '';
$salas           = intval($dados['salas']     ?? 0);
$descricao       = $dados['descricao']        ?? '';
$valorImovel     = floatval($dados['valorImovel'] ?? 0);
$imagensJSON     = json_encode($dados['imagens'] ?? [], JSON_UNESCAPED_SLASHES);

$sql = "INSERT INTO pontos_turisticos (
    bairro, banheiros, cardsSelecionados, cep, cidade, cozinhas,
    estado, hospedes, idAmbiente, idEspaco, lat, lng, numero,
    quartos, rua, salas, descricao, imagens, valorImovel
) VALUES (
    :bairro, :banheiros, :cardsSelecionados, :cep, :cidade, :cozinhas,
    :estado, :hospedes, :idAmbiente, :idEspaco, :lat, :lng, :numero,
    :quartos, :rua, :salas, :descricao, :imagens, :valorImovel
)";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':bairro'           => $bairro,
    ':banheiros'        => $banheiros,
    ':cardsSelecionados'=> $cardsSelecionados,
    ':cep'              => $cep,
    ':cidade'           => $cidade,
    ':cozinhas'         => $cozinhas,
    ':estado'           => $estado,
    ':hospedes'         => $hospedes,
    ':idAmbiente'       => $idAmbiente,
    ':idEspaco'         => $idEspaco,
    ':lat'              => $lat,
    ':lng'              => $lng,
    ':numero'           => $numero,
    ':quartos'          => $quartos,
    ':rua'              => $rua,
    ':salas'            => $salas,
    ':descricao'        => $descricao,
    ':imagens'          => $imagensJSON,
    ':valorImovel'      => $valorImovel,
]);

echo json_encode([
    "sucesso"    => true,
    "id_inserido" => $pdo->lastInsertId(),
    "mensagem"   => "Ponto turístico salvo com sucesso!"
]);
