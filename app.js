// ======================================================
// MEU MÊS - APP.JS
// Controle simples de ganhos e despesas
// ======================================================

let tipoLancamento = "despesa";

// Mês atualmente selecionado
let mesSelecionado = obterMesAtual();

// Lista de lançamentos
let lancamentos = [];


// ======================================================
// CARREGAR DADOS
// ======================================================

try {
    if (typeof localStorage !== "undefined") {
        lancamentos =
            JSON.parse(
                localStorage.getItem("meuMesLancamentos")
            ) || [];
    }
} catch (erro) {
    console.log("Armazenamento local indisponível:", erro);
}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    // Define o mês atual no seletor
    const campoMes = document.getElementById("mesSelecionado");

    if (campoMes) {
        campoMes.value = mesSelecionado;
    }

    // Define a data atual no formulário
    const campoData = document.getElementById("data");

    if (campoData) {
        campoData.value = dataAtual();
    }

    // Define despesa como tipo inicial
    selecionarTipo("despesa");

    // Atualiza a tela
    atualizarTela();
});


// ======================================================
// DATA ATUAL
// ======================================================

function dataAtual() {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


// ======================================================
// MÊS ATUAL
// ======================================================

function obterMesAtual() {
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");

    return `${ano}-${mes}`;
}


// ======================================================
// SELECIONAR TIPO
// ======================================================

function selecionarTipo(tipo) {

    tipoLancamento = tipo;

    const btnDespesa = document.getElementById("btnDespesa");
    const btnGanho = document.getElementById("btnGanho");

    if (btnDespesa) {
        btnDespesa.classList.remove("ativo");
    }

    if (btnGanho) {
        btnGanho.classList.remove("ativo");
    }

    if (tipo === "despesa" && btnDespesa) {
        btnDespesa.classList.add("ativo");
    }

    if (tipo === "ganho" && btnGanho) {
        btnGanho.classList.add("ativo");
    }
}


// ======================================================
// FORMULÁRIO
// ======================================================

const formulario = document.getElementById("formLancamento");

if (formulario) {

    formulario.addEventListener("submit", function (evento) {

        evento.preventDefault();

        const descricao =
            document.getElementById("descricao").value.trim();

        const valor =
            parseFloat(document.getElementById("valor").value);

        const categoria =
            document.getElementById("categoria").value;

        const data =
            document.getElementById("data").value;


        // Validação
        if (!descricao) {
            alert("Digite uma descrição.");
            return;
        }

        if (isNaN(valor) || valor <= 0) {
            alert("Digite um valor válido.");
            return;
        }

        if (!data) {
            alert("Selecione uma data.");
            return;
        }


        // Novo lançamento
        const novoLancamento = {

            id: Date.now(),

            tipo: tipoLancamento,

            descricao: descricao,

            valor: valor,

            categoria: categoria,

            data: data
        };


        // Adiciona à lista
        lancamentos.push(novoLancamento);


        // Salva
        salvarDados();


        // Atualiza o mês automaticamente
        mesSelecionado = data.substring(0, 7);

        const campoMes =
            document.getElementById("mesSelecionado");

        if (campoMes) {
            campoMes.value = mesSelecionado;
        }


        // Atualiza a tela
        atualizarTela();


        // Limpa formulário
        formulario.reset();


        // Mantém a data atual
        const campoData =
            document.getElementById("data");

        if (campoData) {
            campoData.value = dataAtual();
        }


        // Volta para despesa
        selecionarTipo("despesa");
    });
}


// ======================================================
// SALVAR DADOS
// ======================================================

function salvarDados() {

    try {

        if (typeof localStorage !== "undefined") {

            localStorage.setItem(
                "meuMesLancamentos",
                JSON.stringify(lancamentos)
            );
        }

    } catch (erro) {

        console.log(
            "Não foi possível salvar os dados:",
            erro
        );
    }
}


// ======================================================
// OBTER LANÇAMENTOS DO MÊS
// ======================================================

function obterLancamentosDoMes() {

    return lancamentos.filter(function (lancamento) {

        return lancamento.data &&
            lancamento.data.substring(0, 7) === mesSelecionado;

    });
}


// ======================================================
// ALTERAR MÊS
// ======================================================

function alterarMes() {

    const campoMes =
        document.getElementById("mesSelecionado");

    if (!campoMes || !campoMes.value) {
        return;
    }

    mesSelecionado = campoMes.value;

    atualizarTela();
}


// ======================================================
// MÊS ANTERIOR
// ======================================================

function mesAnterior() {

    const partes =
        mesSelecionado.split("-");

    const ano = parseInt(partes[0]);
    const mes = parseInt(partes[1]);


    const data =
        new Date(ano, mes - 2, 1);


    mesSelecionado =
        `${data.getFullYear()}-${String(
            data.getMonth() + 1
        ).padStart(2, "0")}`;


    const campoMes =
        document.getElementById("mesSelecionado");

    if (campoMes) {
        campoMes.value = mesSelecionado;
    }


    atualizarTela();
}


// ======================================================
// PRÓXIMO MÊS
// ======================================================

function proximoMes() {

    const partes =
        mesSelecionado.split("-");

    const ano = parseInt(partes[0]);
    const mes = parseInt(partes[1]);


    const data =
        new Date(ano, mes, 1);


    mesSelecionado =
        `${data.getFullYear()}-${String(
            data.getMonth() + 1
        ).padStart(2, "0")}`;


    const campoMes =
        document.getElementById("mesSelecionado");

    if (campoMes) {
        campoMes.value = mesSelecionado;
    }


    atualizarTela();
}


// ======================================================
// ATUALIZAR RESUMO
// ======================================================

function atualizarResumo() {

    const lancamentosMes =
        obterLancamentosDoMes();


    let totalGanhos = 0;

    let totalDespesas = 0;


    lancamentosMes.forEach(function (lancamento) {

        if (lancamento.tipo === "ganho") {

            totalGanhos += Number(lancamento.valor);

        } else {

            totalDespesas += Number(lancamento.valor);

        }

    });


    const saldo =
        totalGanhos - totalDespesas;


    // Elementos da tela
    const elementoGanhos =
        document.getElementById("totalGanhos");

    const elementoDespesas =
        document.getElementById("totalDespesas");

    const elementoSaldo =
        document.getElementById("saldo");


    if (elementoGanhos) {

        elementoGanhos.textContent =
            formatarMoeda(totalGanhos);
    }


    if (elementoDespesas) {

        elementoDespesas.textContent =
            formatarMoeda(totalDespesas);
    }


    if (elementoSaldo) {

        elementoSaldo.textContent =
            formatarMoeda(saldo);
    }


    // Calcula limite diário
    calcularLimiteDiario(saldo);
}


// ======================================================
// LIMITE DIÁRIO
// ======================================================

function calcularLimiteDiario(saldo) {

    const elemento =
        document.getElementById("limiteDiario");


    if (!elemento) {
        return;
    }


    const hoje = new Date();

    const anoSelecionado =
        parseInt(mesSelecionado.substring(0, 4));

    const mesSelecionadoNumero =
        parseInt(mesSelecionado.substring(5, 7));


    const anoAtual =
        hoje.getFullYear();

    const mesAtual =
        hoje.getMonth() + 1;


    let diasRestantes;


    // Se for o mês atual
    if (
        anoSelecionado === anoAtual &&
        mesSelecionadoNumero === mesAtual
    ) {

        const ultimoDia =
            new Date(
                anoAtual,
                mesAtual,
                0
            ).getDate();


        const diaAtual =
            hoje.getDate();


        diasRestantes =
            ultimoDia - diaAtual + 1;

    }

    // Se for um mês futuro
    else if (
        new Date(
            anoSelecionado,
            mesSelecionadoNumero - 1,
            1
        ) > hoje
    ) {

        const ultimoDia =
            new Date(
                anoSelecionado,
                mesSelecionadoNumero,
                0
            ).getDate();


        diasRestantes = ultimoDia;

    }

    // Mês passado
    else {

        diasRestantes = 1;
    }


    let limiteDiario = 0;


    if (saldo > 0 && diasRestantes > 0) {

        limiteDiario =
            saldo / diasRestantes;
    }


    elemento.textContent =
        formatarMoeda(limiteDiario);
}


// ======================================================
// ATUALIZAR LISTA
// ======================================================

function atualizarLista() {

    const lista =
        document.getElementById("listaLancamentos");


    if (!lista) {
        return;
    }


    const lancamentosMes =
        obterLancamentosDoMes();


    // Limpa a lista
    lista.innerHTML = "";


    // Nenhum lançamento
    if (lancamentosMes.length === 0) {

        lista.innerHTML = `
            <div class="sem-lancamentos">
                <p>📭 Nenhum lançamento neste mês.</p>
            </div>
        `;

        return;
    }


    // Ordena por data, mais recente primeiro
    const ordenados =
        [...lancamentosMes].sort(function (a, b) {

            return new Date(b.data) -
                new Date(a.data);
        });


    ordenados.forEach(function (lancamento) {

        const item =
            document.createElement("div");


        item.className =
            "lancamento";


        if (lancamento.tipo === "ganho") {

            item.classList.add("ganho");

        } else {

            item.classList.add("despesa");

        }


        const sinal =
            lancamento.tipo === "ganho"
                ? "+"
                : "-";


        item.innerHTML = `

            <div class="lancamento-info">

                <strong>
                    ${escapeHTML(lancamento.descricao)}
                </strong>

                <small>
                    ${escapeHTML(lancamento.categoria)}
                    •
                    ${formatarData(lancamento.data)}
                </small>

            </div>

            <div class="lancamento-valor">

                <span>
                    ${sinal}
                    ${formatarMoeda(lancamento.valor)}
                </span>

                <button
                    type="button"
                    onclick="excluirLancamento(${lancamento.id})"
                    aria-label="Excluir lançamento"
                >
                    🗑️
                </button>

            </div>

        `;


        lista.appendChild(item);
    });
}


// ======================================================
// EXCLUIR LANÇAMENTO
// ======================================================

function excluirLancamento(id) {

    const confirmar =
        confirm(
            "Deseja realmente excluir este lançamento?"
        );


    if (!confirmar) {
        return;
    }


    lancamentos =
        lancamentos.filter(function (lancamento) {

            return lancamento.id !== id;

        });


    salvarDados();

    atualizarTela();
}


// ======================================================
// ATUALIZAR TODA A TELA
// ======================================================

function atualizarTela() {

    atualizarResumo();

    atualizarLista();
}


// ======================================================
// FORMATAR MOEDA
// ======================================================

function formatarMoeda(valor) {

    return Number(valor).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


// ======================================================
// FORMATAR DATA
// ======================================================

function formatarData(data) {

    if (!data) {
        return "";
    }


    const partes =
        data.split("-");


    if (partes.length !== 3) {
        return data;
    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


// ======================================================
// PROTEÇÃO CONTRA HTML
// ======================================================

function escapeHTML(texto) {

    const div =
        document.createElement("div");


    div.textContent =
        texto;


    return div.innerHTML;
}