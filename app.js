// ======================================================
// MEU MÊS - APP.JS
// Controle simples de ganhos e despesas
// ======================================================

let tipoLancamento = "despesa";

// Mês atualmente selecionado
let mesSelecionado = obterMesAtual();

// Lista de lançamentos
let lancamentos = [];

const NOME_BANCO_DADOS = "meuMes";
const VERSAO_BANCO_DADOS = 1;
const CHAVE_ESTADO = "principal";
let bancoDadosPromise;
let arquivoBackup = null;
let persistenciaEmFila = Promise.resolve();


// ======================================================
// CARREGAR DADOS
// ======================================================

function abrirBancoDados() {
    if (!("indexedDB" in window)) {
        return Promise.reject(
            new Error("Este navegador não oferece armazenamento IndexedDB.")
        );
    }

    if (!bancoDadosPromise) {
        bancoDadosPromise = new Promise(function (resolve, reject) {
            const solicitacao = indexedDB.open(
                NOME_BANCO_DADOS,
                VERSAO_BANCO_DADOS
            );

            solicitacao.onupgradeneeded = function () {
                const banco = solicitacao.result;

                if (!banco.objectStoreNames.contains("estado")) {
                    banco.createObjectStore("estado", { keyPath: "id" });
                }
            };

            solicitacao.onsuccess = function () {
                resolve(solicitacao.result);
            };

            solicitacao.onerror = function () {
                reject(solicitacao.error);
            };
        });
    }

    return bancoDadosPromise;
}

async function lerEstadoPersistido() {
    const banco = await abrirBancoDados();

    return new Promise(function (resolve, reject) {
        const transacao = banco.transaction("estado", "readonly");
        const solicitacao = transacao
            .objectStore("estado")
            .get(CHAVE_ESTADO);

        solicitacao.onsuccess = function () {
            resolve(solicitacao.result || null);
        };

        solicitacao.onerror = function () {
            reject(solicitacao.error);
        };
    });
}

async function gravarEstadoPersistido(estado) {
    const banco = await abrirBancoDados();

    return new Promise(function (resolve, reject) {
        const transacao = banco.transaction("estado", "readwrite");
        transacao.objectStore("estado").put(estado);
        transacao.oncomplete = resolve;
        transacao.onerror = function () {
            reject(transacao.error);
        };
        transacao.onabort = function () {
            reject(transacao.error || new Error("Não foi possível salvar os dados."));
        };
    });
}

function lerLancamentosLegados() {
    if (typeof localStorage === "undefined") {
        return [];
    }

    const dados = JSON.parse(localStorage.getItem("meuMesLancamentos"));
    return Array.isArray(dados) ? dados : [];
}

function atualizarStatusBackup(mensagem, erro) {
    const status = document.getElementById("statusBackup");

    if (status) {
        status.textContent = mensagem;
        status.classList.toggle("erro", Boolean(erro));
    }
}

function validarLancamentos(dados) {
    if (!Array.isArray(dados)) {
        throw new Error("O arquivo não contém uma lista de lançamentos válida.");
    }

    return dados.map(function (item) {
        if (
            !item ||
            (typeof item.id !== "number" && typeof item.id !== "string") ||
            typeof item.descricao !== "string" ||
            !["ganho", "despesa"].includes(item.tipo) ||
            !Number.isFinite(Number(item.valor)) ||
            Number(item.valor) <= 0 ||
            typeof item.data !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(item.data)
        ) {
            throw new Error("O arquivo contém um lançamento inválido.");
        }

        return {
            id: item.id,
            tipo: item.tipo,
            descricao: item.descricao,
            valor: Number(item.valor),
            categoria: String(item.categoria || "Outros"),
            data: String(item.data)
        };
    });
}

function obterConteudoBackup() {
    return JSON.stringify({
        versao: 1,
        atualizadoEm: new Date().toISOString(),
        lancamentos: lancamentos
    }, null, 2);
}

async function gravarArquivoBackup() {
    if (!arquivoBackup) {
        return false;
    }

    const permissao = await arquivoBackup.queryPermission({
        mode: "readwrite"
    });

    if (permissao !== "granted") {
        return false;
    }

    const gravador = await arquivoBackup.createWritable();
    await gravador.write(obterConteudoBackup());
    await gravador.close();
    return true;
}

async function iniciarPersistencia() {
    try {
        const estado = await lerEstadoPersistido();

        if (estado && Array.isArray(estado.lancamentos)) {
            lancamentos = validarLancamentos(estado.lancamentos);
            arquivoBackup = estado.arquivoBackup || null;
            atualizarStatusBackup(
                arquivoBackup
                    ? "Dados salvos automaticamente neste dispositivo. Arquivo de backup vinculado."
                    : "Salvamento automático neste dispositivo ativo. Crie um arquivo JSON para ter uma cópia externa."
            );
        } else {
            lancamentos = lerLancamentosLegados();
            atualizarStatusBackup(
                "Dados antigos carregados. Serão protegidos no armazenamento do dispositivo."
            );
            salvarDados();
        }

        if (arquivoBackup && "queryPermission" in arquivoBackup) {
            const permissao = await arquivoBackup.queryPermission({
                mode: "readwrite"
            });

            if (permissao !== "granted") {
                atualizarStatusBackup(
                    "Backup automático pausado: permita novamente o acesso ao arquivo."
                );
                const botao = document.getElementById("btnReconectarBackup");
                if (botao) {
                    botao.hidden = false;
                }
            }
        }
    } catch (erro) {
        try {
            lancamentos = lerLancamentosLegados();
        } catch (erroLocalStorage) {
            console.error("Não foi possível ler os dados locais:", erroLocalStorage);
            atualizarStatusBackup(
                "Não foi possível carregar os dados salvos. Verifique as permissões do navegador.",
                true
            );
        }

        console.error("Não foi possível abrir o armazenamento persistente:", erro);
        atualizarStatusBackup(
            "Armazenamento local indisponível. Exporte um backup JSON para proteger seus dados.",
            true
        );
    }
}


// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", async function () {

    await iniciarPersistencia();

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

    configurarBackup();
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
    let erroLocalStorage = null;
    try {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(
                "meuMesLancamentos",
                JSON.stringify(lancamentos)
            );
        }
    } catch (erro) {
        erroLocalStorage = erro;
    }

    if (erroLocalStorage) {
        console.error("Não foi possível salvar no armazenamento legado:", erroLocalStorage);
    }

    const estado = {
        id: CHAVE_ESTADO,
        lancamentos: lancamentos.map(function (item) {
            return { ...item };
        }),
        arquivoBackup: arquivoBackup
    };

    persistenciaEmFila = persistenciaEmFila
        .then(async function () {
            await gravarEstadoPersistido(estado);

            const arquivoSalvo = await gravarArquivoBackup();
            const botaoReconectar =
                document.getElementById("btnReconectarBackup");

            if (arquivoSalvo) {
                atualizarStatusBackup(
                    "Dados salvos neste dispositivo e no arquivo JSON."
                );
                if (botaoReconectar) {
                    botaoReconectar.hidden = true;
                }
            } else if (arquivoBackup) {
                atualizarStatusBackup(
                    "Dados salvos neste dispositivo. Permita acesso ao arquivo para atualizar o backup."
                );
                if (botaoReconectar) {
                    botaoReconectar.hidden = false;
                }
            } else {
                atualizarStatusBackup(
                    "Dados salvos automaticamente neste dispositivo. Crie um arquivo JSON para ter uma cópia externa."
                );
            }
        })
        .catch(function (erro) {
            console.error("Não foi possível salvar os dados persistentes:", erro);
            const botaoReconectar =
                document.getElementById("btnReconectarBackup");

            if (arquivoBackup && botaoReconectar) {
                botaoReconectar.hidden = false;
            }
            atualizarStatusBackup(
                "Falha ao salvar os dados. Exporte um backup JSON e confira o espaço/permissões do navegador.",
                true
            );
        });
}

function salvarArquivoParaDownload() {
    const arquivo = new Blob([obterConteudoBackup()], {
        type: "application/json"
    });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = "meu-mes-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    atualizarStatusBackup(
        "Backup JSON baixado. Guarde o arquivo fora da pasta de downloads temporários."
    );
}

async function criarOuVincularArquivoBackup() {
    if (!("showSaveFilePicker" in window)) {
        salvarArquivoParaDownload();
        return;
    }

    try {
        const novoArquivo = await window.showSaveFilePicker({
            suggestedName: "meu-mes-backup.json",
            types: [{
                description: "Backup Meu Mês",
                accept: { "application/json": [".json"] }
            }]
        });
        const existente = await novoArquivo.getFile();

        if (
            existente.size > 0 &&
            !confirm("Este arquivo já contém dados. Deseja substituí-los pelos lançamentos atuais?")
        ) {
            return;
        }

        arquivoBackup = novoArquivo;
        const estado = {
            id: CHAVE_ESTADO,
            lancamentos: lancamentos.map(function (item) {
                return { ...item };
            }),
            arquivoBackup: arquivoBackup
        };

        await gravarEstadoPersistido(estado);
        const gravado = await gravarArquivoBackup();

        if (!gravado) {
            atualizarStatusBackup(
                "O arquivo foi selecionado, mas o Chrome não concedeu permissão de gravação.",
                true
            );
            document.getElementById("btnReconectarBackup").hidden = false;
            return;
        }

        document.getElementById("btnReconectarBackup").hidden = true;
        atualizarStatusBackup(
            "Arquivo JSON vinculado. Os próximos lançamentos serão salvos nele automaticamente."
        );
    } catch (erro) {
        if (erro.name !== "AbortError") {
            console.error("Não foi possível criar o arquivo de backup:", erro);
            atualizarStatusBackup(
                "Não foi possível criar/vincular o arquivo de backup.",
                true
            );
        }
    }
}

async function restaurarArquivoBackup(arquivo, handle) {
    try {
        const conteudo = JSON.parse(await arquivo.text());
        const dados = Array.isArray(conteudo)
            ? conteudo
            : conteudo.lancamentos;
        const lancamentosRestaurados = validarLancamentos(dados);

        if (!confirm("Restaurar este backup? Os lançamentos atuais serão substituídos.")) {
            return;
        }

        lancamentos = lancamentosRestaurados;
        arquivoBackup = handle || null;
        salvarDados();
        atualizarTela();
    } catch (erro) {
        console.error("Não foi possível restaurar o arquivo de backup:", erro);
        atualizarStatusBackup(
            erro instanceof SyntaxError
                ? "O arquivo selecionado não contém um JSON válido."
                : erro.message,
            true
        );
    }
}

async function selecionarArquivoParaRestaurar() {
    if ("showOpenFilePicker" in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: "Backup Meu Mês",
                    accept: { "application/json": [".json"] }
                }]
            });
            await restaurarArquivoBackup(await handle.getFile(), handle);
        } catch (erro) {
            if (erro.name !== "AbortError") {
                console.error("Não foi possível abrir o arquivo de backup:", erro);
                atualizarStatusBackup("Não foi possível abrir o arquivo de backup.", true);
            }
        }
        return;
    }

    const seletor = document.createElement("input");
    seletor.type = "file";
    seletor.accept = ".json,application/json";
    seletor.addEventListener("change", async function () {
        if (seletor.files && seletor.files[0]) {
            await restaurarArquivoBackup(seletor.files[0], null);
        }
    }, { once: true });
    seletor.click();
}

async function reconectarArquivoBackup() {
    if (!arquivoBackup) {
        await criarOuVincularArquivoBackup();
        return;
    }

    try {
        const permissao = await arquivoBackup.requestPermission({
            mode: "readwrite"
        });

        if (permissao !== "granted") {
            atualizarStatusBackup(
                "A permissão não foi concedida. Os dados continuam salvos neste dispositivo.",
                true
            );
            return;
        }

        document.getElementById("btnReconectarBackup").hidden = true;
        salvarDados();
    } catch (erro) {
        console.error("Não foi possível reconectar o arquivo de backup:", erro);
        atualizarStatusBackup("Não foi possível acessar o arquivo de backup.", true);
    }
}

function configurarBackup() {
    const botaoCriar = document.getElementById("btnCriarBackup");
    const botaoRestaurar = document.getElementById("btnRestaurarBackup");
    const botaoReconectar = document.getElementById("btnReconectarBackup");

    botaoCriar.addEventListener("click", criarOuVincularArquivoBackup);
    botaoRestaurar.addEventListener("click", selecionarArquivoParaRestaurar);
    botaoReconectar.addEventListener("click", reconectarArquivoBackup);

    if (!("showSaveFilePicker" in window)) {
        botaoCriar.textContent = "Baixar arquivo de backup JSON";
        atualizarStatusBackup(
            "Salvamento automático no dispositivo ativo. Neste navegador, backups em arquivo precisam ser baixados e restaurados manualmente."
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