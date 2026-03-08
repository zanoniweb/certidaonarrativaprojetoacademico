// 1. PROTEÇÃO DE ROTA (Impedir acesso direto sem login)
if (!localStorage.getItem("loggedIn") && window.location.pathname.includes("consulta.html")) {
    window.location.href = "index.html";
}

const users = [
    { username: "alemaochefe", password: "alemao1234" },
    { username: "jzanoni", password: "180804" }
];

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

// Variável global para o PDF
let dadosParaPDF = null;

async function buscarDados() {
    const inscricao = document.getElementById('search').value.trim();
    if (!inscricao) {
        alert("Por favor, digite uma inscrição!");
        return;
    }

    const anos = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    let resultados = [];
    
    // Limpar tabela antes de começar a busca
    document.querySelector('#resultTable tbody').innerHTML = '<tr><td colspan="7">Pesquisando nas tabelas...</td></tr>';

    for (let ano of anos) {
        const url = `tabelas/${ano}.xlsx`;
        try {
            const response = await fetch(url);
            if (!response.ok) continue; // Se o arquivo do ano não existir, pula pro próximo

            const data = await response.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            json.forEach(row => {
                // row[0] é a inscrição municipal
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
            console.error(`Erro ao processar ano ${ano}:`, error);
        }
    }

    exibirResultados(resultados);
}

function exibirResultados(resultados) {
    const tableBody = document.querySelector('#resultTable tbody');
    const btnPDF = document.getElementById('btnPDF');
    tableBody.innerHTML = '';

    if (resultados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7">Nenhum resultado encontrado para esta inscrição.</td></tr>`;
        if(btnPDF) btnPDF.style.display = 'none';
        dadosParaPDF = null;
        return;
    }

    // Pega o dado mais recente para o PDF
    dadosParaPDF = resultados[resultados.length - 1];
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

async function gerarPDF() {
    if (!dadosParaPDF) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Prefeitura Municipal: Projeto Certidões", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text([
        "Secretaria Municipal da Fazenda",
        "Rua Teste, XX - CNPJ 11.111.111/0001-11",
        "Tel: (11) 1111-1111"
    ], 105, 30, { align: "center" });
    
    doc.line(20, 45, 190, 45);

    // Título
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIDÃO NARRATIVA TÉCNICA ADMINISTRATIVA", 105, 60, { align: "center" });

    // Lógica Vago vs Edificado
    const isVago = dadosParaPDF.inscricao.toString().endsWith(".000");
    let texto = "";

    if (isVago) {
        texto = `Certificamos que o imóvel de Inscrição Municipal ${dadosParaPDF.inscricao}, Quadra ${dadosParaPDF.quadra}, Lote ${dadosParaPDF.lote}, é um TERRENO VAGO, com área de ${dadosParaPDF.metragem} m², conforme dados de ${dadosParaPDF.ano}.`;
    } else {
        texto = `Certificamos que o imóvel de Inscrição Municipal ${dadosParaPDF.inscricao}, Quadra ${dadosParaPDF.quadra}, Lote ${dadosParaPDF.lote}, possui EDIFICAÇÃO (${dadosParaPDF.utilizacao}), com área de ${dadosParaPDF.metragem} m², conforme dados de ${dadosParaPDF.ano}.`;
    }

    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(texto, 170);
    doc.text(splitText, 20, 80);

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(8);
    doc.text(`Documento gerado em: ${dataAtual}`, 20, 280);

    doc.save(`Certidao_${dadosParaPDF.inscricao}.pdf`);
}

// Eventos de Orientação
document.getElementById("btnOrientacoes").addEventListener("click", () => {
    document.getElementById("manual").classList.add("ativo");
});

document.getElementById("btnFechar").addEventListener("click", () => {
    document.getElementById("manual").classList.remove("ativo");
});