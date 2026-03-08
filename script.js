// 1. PROTEÇÃO DE ROTA
// Impede o acesso direto à página de consulta caso o usuário não tenha feito login
if (!localStorage.getItem("loggedIn") && window.location.pathname.includes("consulta.html")) {
    window.location.href = "index.html";
}

// 2. BASE DE USUÁRIOS (Simulada para o projeto acadêmico)
const users = [
    { username: "alemaochefe", password: "alemao1234" },
    { username: "jzanoni", password: "180804" }
];

// 3. SISTEMA DE AUTENTICAÇÃO
function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    let errorMessage = document.getElementById("error-message");

    let user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem("loggedIn", "true");
        window.location.href = "consulta.html";
    } else {
        errorMessage.textContent = "Usuário ou senha incorretos!";
    }
}

function logout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
}

// 4. VARIÁVEL GLOBAL PARA O HISTÓRICO DO PDF
let todosResultadosPDF = [];

// 5. BUSCA DE DADOS NAS TABELAS EXCEL (2020-2026)
async function buscarDados() {
    const inscricao = document.getElementById('search').value.trim();
    if (!inscricao) {
        alert("Por favor, digite uma inscrição municipal!");
        return;
    }

    const anos = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    let resultados = [];
    
    // Feedback visual de carregamento
    const tableBody = document.querySelector('#resultTable tbody');
    tableBody.innerHTML = '<tr><td colspan="7">Processando histórico cadastral (2020-2026)...</td></tr>';

    for (let ano of anos) {
        const url = `tabelas/${ano}.xlsx`;
        try {
            const response = await fetch(url);
            if (!response.ok) continue; // Pula se o arquivo do ano específico não existir

            const data = await response.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            json.forEach(row => {
                // Filtra pela inscrição municipal (Coluna 0 da tabela)
                if (row[0] && row[0].toString().includes(inscricao)) {
                    resultados.push({
                        inscricao: row[0],
                        quadra: row[1] || '---',
                        lote: row[2] || '---',
                        ano: ano,
                        metragem: row[4] || '0',
                        utilizacao: row[5] || 'N/A',
                        estrutura: row[6] || 'N/A',
                    });
                }
            });
        } catch (error) {
            console.error(`Erro ao processar base de dados de ${ano}:`, error);
        }
    }

    exibirResultados(resultados);
}

// 6. EXIBIÇÃO NA TELA E PREPARAÇÃO PARA PDF
function exibirResultados(resultados) {
    const tableBody = document.querySelector('#resultTable tbody');
    const btnPDF = document.getElementById('btnPDF');
    tableBody.innerHTML = '';

    if (resultados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7">Nenhum registro encontrado para a inscrição informada.</td></tr>`;
        if(btnPDF) btnPDF.style.display = 'none';
        todosResultadosPDF = [];
        return;
    }

    // Armazena os dados encontrados para a tabela do PDF
    todosResultadosPDF = resultados; 
    if(btnPDF) btnPDF.style.display = 'inline-block';

    resultados.forEach(res => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${res.inscricao}</td>
            <td>${res.quadra}</td>
            <td>${res.lote}</td>
            <td>${res.ano}</td>
            <td>${res.metragem}</td>
            <td>${res.utilizacao}</td>
            <td>${res.estrutura}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 7. GERAÇÃO DA CERTIDÃO NARRATIVA JURÍDICA EM PDF
async function gerarPDF() {
    if (todosResultadosPDF.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuração de Cabeçalho Institucional
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("PREFEITURA MUNICIPAL", 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("PROJETO CERTIDÕES - SECRETARIA MUNICIPAL DA FAZENDA", 105, 27, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text([
        "Rua Teste, XX - Centro - CNPJ 11.111.111/0001-11",
        "Telefone: (11) 1111-1111 | Atendimento ao Contribuinte"
    ], 105, 33, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Título Jurídico-Administrativo
    doc.setFontSize(13);
    doc.setFont("times", "bold");
    doc.text("CERTIDÃO NARRATIVA DE HISTÓRICO CADASTRAL", 105, 55, { align: "center" });

    // Preâmbulo com Linguagem Formal
    const ultimoRegistro = todosResultadosPDF[todosResultadosPDF.length - 1];
    const isVago = ultimoRegistro.inscricao.toString().endsWith(".000");
    
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    
    let preambulo = `O MUNICÍPIO, através da Divisão de Cadastro Imobiliário, no uso de suas atribuições legais e em conformidade com os registros constantes no sistema de lançamentos tributários (IPTU), CERTIFICA para os devidos fins de direito que, após análise do histórico imobiliário referente à Inscrição Municipal nº ${ultimoRegistro.inscricao}, constatou-se a seguinte situação técnica:`;

    const splitPreambulo = doc.splitTextToSize(preambulo, 170);
    doc.text(splitPreambulo, 20, 70);

    // Conclusão Técnica
    let conclusaoTecnica = "";
    if (isVago) {
        conclusaoTecnica = `O referido imóvel caracteriza-se legalmente como TERRENO VAGO (sem edificações averbadas), apresentando área territorial de ${ultimoRegistro.metragem} m² no exercício atual.`;
    } else {
        conclusaoTecnica = `O referido imóvel possui EDIFICAÇÃO CONSOLIDADA de utilização ${ultimoRegistro.utilizacao}, com estrutura em ${ultimoRegistro.estrutura}, totalizando ${ultimoRegistro.metragem} m² de área construída conforme o cadastro de ${ultimoRegistro.ano}.`;
    }

    const splitConclusao = doc.splitTextToSize(conclusaoTecnica, 170);
    doc.text(splitConclusao, 20, 95);

    // Quadro de Histórico Automático (Plugin autoTable)
    doc.setFont("times", "bold");
    doc.text("QUADRO DE EVOLUÇÃO CRONOLÓGICA (2020-2026):", 20, 115);

    const headers = [["Inscrição", "Quadra", "Lote", "Ano", "Área (m²)", "Utilização", "Estrutura"]];
    const dataRows = todosResultadosPDF.map(res => [
        res.inscricao, res.quadra, res.lote, res.ano, res.metragem, res.utilizacao, res.estrutura
    ]);

    doc.autoTable({
        startY: 120,
        head: headers,
        body: dataRows,
        theme: 'grid',
        headStyles: { fillGray: true, textColor: 20, fontStyle: 'bold' },
        styles: { font: "times", fontSize: 9 },
        margin: { left: 20, right: 20 }
    });

    // Encerramento e Assinatura
    const dataAtual = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const finalY = doc.lastAutoTable.finalY + 20;

    doc.setFont("times", "normal");
    doc.text(`O referido é verdade e dou fé.`, 20, finalY);
    doc.text(`Documento gerado em, ${dataAtual}.`, 20, finalY + 10);

    doc.line(70, finalY + 40, 140, finalY + 40);
    doc.setFontSize(10);
    doc.text("Responsável pela Emissão", 105, finalY + 45, { align: "center" });
    doc.text("Divisão de Cadastro Imobiliário", 105, finalY + 50, { align: "center" });

    // Nome do arquivo gerado
    doc.save(`Certidao_Narrativa_${ultimoRegistro.inscricao}.pdf`);
}

// 8. INTERAÇÃO DO MANUAL (MODAL)
document.getElementById("btnOrientacoes").addEventListener("click", () => {
    document.getElementById("manual").classList.add("ativo");
});

document.getElementById("btnFechar").addEventListener("click", () => {
    document.getElementById("manual").classList.remove("ativo");
});