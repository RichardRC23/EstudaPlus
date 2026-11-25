"use strict";

// Menu responsivo, compartilhado pelas três páginas.
document.documentElement.classList.add("js");
const botaoMenu = document.querySelector(".menu-botao");
const menu = document.querySelector("#menu");

function fecharMenu() {
  menu.classList.remove("aberto");
  botaoMenu.setAttribute("aria-expanded", "false");
}

botaoMenu.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  botaoMenu.setAttribute("aria-expanded", String(aberto));
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && menu.classList.contains("aberto")) {
    fecharMenu();
    botaoMenu.focus();
  }
});
menu.addEventListener("click", (evento) => {
  if (evento.target.closest("a")) fecharMenu();
});

// O planejador só é iniciado na página que contém o formulário.
if (document.querySelector("#formulario")) iniciarPlanejador();

function iniciarPlanejador() {
  const $ = (seletor) => document.querySelector(seletor);
  const formulario = $("#formulario");
  const lista = $("#lista");
  const mensagem = $("#mensagem");
  const prioridades = { alta: "Alta", normal: "Normal", baixa: "Baixa" };
  let tarefas = [];
  let editando = null;
  let ocupado = false;

  function avisar(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("erro", erro);
    mensagem.hidden = false;
  }

  function dataValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(valor + "T12:00:00");
    const [ano, mes, dia] = valor.split("-").map(Number);
    return ano >= 1 && data.getFullYear() === ano && data.getMonth() + 1 === mes && data.getDate() === dia;
  }

  // A API retorna a lista atualizada depois de cada alteração no SQLite.
  async function sincronizar(metodo = "GET", id = null, dados = null) {
    ocupado = true;
    for (const campo of formulario.elements) campo.disabled = true;
    lista.setAttribute("aria-busy", "true");
    try {
      const url = id === null ? "api.php" : "api.php?id=" + encodeURIComponent(id);
      const opcoes = { method: metodo, cache: "no-store" };
      if (dados !== null) {
        opcoes.headers = { "Content-Type": "application/json" };
        opcoes.body = JSON.stringify(dados);
      }
      const resposta = await fetch(url, opcoes);
      const tipo = resposta.headers.get("content-type") || "";
      if (!tipo.includes("application/json")) {
        throw new Error("Abra o site pelo servidor PHP e confira se api.php está na pasta public.");
      }
      const resultado = await resposta.json();
      if (!resposta.ok || !Array.isArray(resultado.tarefas)) {
        throw new Error(resultado.erro || "O servidor não retornou a lista de tarefas.");
      }
      tarefas = resultado.tarefas;
      mensagem.hidden = true;
      return true;
    } catch (erro) {
      avisar(erro instanceof TypeError
        ? "Não foi possível conectar. Confira se o servidor PHP está rodando."
        : erro.message, true);
      return false;
    } finally {
      ocupado = false;
      for (const campo of formulario.elements) campo.disabled = false;
      lista.setAttribute("aria-busy", "false");
    }
  }

  function normalizar(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function dataFormatada(data) {
    return data.split("-").reverse().join("/");
  }

  // textContent mostra os dados como texto, sem executar HTML digitado.
  function elemento(tag, classe, texto) {
    const item = document.createElement(tag);
    if (classe) item.className = classe;
    if (texto !== undefined) item.textContent = texto;
    return item;
  }

  function renderizar() {
    const concluidas = tarefas.filter((t) => t.concluida).length;
    const percentual = tarefas.length ? Math.round(concluidas / tarefas.length * 100) : 0;
    $("#total").textContent = tarefas.length;
    $("#pendentes").textContent = tarefas.length - concluidas;
    $("#concluidas").textContent = concluidas;
    $("#porcentagem").textContent = percentual + "%";
    $("#barra").value = percentual;
    $("#exportar").disabled = tarefas.length === 0;

    const busca = normalizar($("#busca").value.trim());
    const filtro = $("#filtro").value;
    const visiveis = tarefas.filter((t) => {
      const corresponde = normalizar(t.titulo + " " + t.materia).includes(busca);
      const status = filtro === "todas" || (filtro === "concluidas" ? t.concluida : !t.concluida);
      return corresponde && status;
    });

    lista.replaceChildren();
    $("#quantidade").textContent = visiveis.length + (visiveis.length === 1 ? " tarefa encontrada" : " tarefas encontradas");
    $("#vazio").hidden = visiveis.length > 0;
    $("#vazio h3").textContent = tarefas.length ? "Nenhuma tarefa encontrada." : "Seu plano começa aqui.";
    $("#vazio p").textContent = tarefas.length ? "Tente outra busca ou altere o filtro." : "Cadastre sua primeira tarefa no formulário.";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    for (const tarefa of visiveis) {
      const cartao = elemento("article", "cartao tarefa" + (tarefa.concluida ? " finalizada" : ""));
      const marcadores = elemento("div", "marcadores");
      marcadores.append(elemento("span", "marcador " + tarefa.prioridade, "Prioridade " + prioridades[tarefa.prioridade].toLowerCase()));
      marcadores.append(elemento("span", "marcador" + (tarefa.concluida ? " concluida" : ""), tarefa.concluida ? "Concluída" : "Pendente"));
      if (!tarefa.concluida && new Date(tarefa.prazo + "T00:00:00") < hoje) {
        marcadores.append(elemento("span", "marcador atrasada", "Prazo vencido"));
      }
      const acoes = elemento("div", "acoes-tarefa");
      const botoes = [
        ["alternar", tarefa.concluida ? "Reabrir" : "Concluir ✓", ""],
        ["editar", "Editar", "secundario"],
        ["excluir", "Excluir", "secundario perigo"]
      ];
      for (const [acao, rotulo, estilo] of botoes) {
        const botao = elemento("button", "botao pequeno " + estilo, rotulo);
        botao.type = "button";
        botao.dataset.acao = acao;
        botao.dataset.id = tarefa.id;
        botao.setAttribute("aria-label", rotulo.replace(" ✓", "") + " tarefa: " + tarefa.titulo);
        acoes.append(botao);
      }
      cartao.append(marcadores, elemento("h3", "", tarefa.titulo), elemento("p", "", tarefa.materia + " · Prazo: " + dataFormatada(tarefa.prazo)), acoes);
      lista.append(cartao);
    }
  }

  function limparFormulario() {
    editando = null;
    formulario.reset();
    $("#titulo-form").textContent = "Nova tarefa";
    $("#salvar").textContent = "Adicionar tarefa +";
    $("#cancelar").hidden = true;
    $("#titulo").setCustomValidity("");
    $("#materia").setCustomValidity("");
    $("#prazo").setCustomValidity("");
  }

  formulario.addEventListener("input", (evento) => evento.target.setCustomValidity(""));
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (ocupado) return;
    const titulo = $("#titulo").value.trim();
    const materia = $("#materia").value.trim();
    const prazo = $("#prazo").value;
    $("#titulo").setCustomValidity(titulo.length < 3 ? "Digite um título com pelo menos 3 caracteres." : "");
    $("#materia").setCustomValidity(!materia ? "Informe a matéria." : "");
    $("#prazo").setCustomValidity(!dataValida(prazo) ? "Informe uma data válida." : "");
    if (!formulario.reportValidity()) return;
    const tarefa = { titulo, materia, prazo, prioridade: $("#prioridade").value };
    const eraEdicao = editando !== null;
    if (await sincronizar(eraEdicao ? "PUT" : "POST", editando, tarefa)) {
      limparFormulario();
      $("#busca").value = "";
      $("#filtro").value = "todas";
      renderizar();
      avisar(eraEdicao ? "Tarefa atualizada!" : "Tarefa adicionada ao seu planejamento!");
      $("#titulo").focus();
    }
  });

  lista.addEventListener("click", async (evento) => {
    if (ocupado) return;
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const tarefa = tarefas.find((t) => t.id === botao.dataset.id);
    if (!tarefa) return;
    if (botao.dataset.acao === "editar") {
      limparFormulario();
      editando = tarefa.id;
      for (const campo of ["titulo", "materia", "prazo", "prioridade"]) $("#" + campo).value = tarefa[campo];
      $("#titulo-form").textContent = "Editar tarefa";
      $("#salvar").textContent = "Salvar alterações";
      $("#cancelar").hidden = false;
      $("#titulo").focus();
      return;
    }
    if (botao.dataset.acao === "excluir") {
      if (!window.confirm('Excluir a tarefa "' + tarefa.titulo + '"?')) return;
      if (await sincronizar("DELETE", tarefa.id)) {
        if (editando === tarefa.id) limparFormulario();
        renderizar();
        avisar("Tarefa excluída.");
        $("#titulo").focus();
      }
    } else if (await sincronizar("PATCH", tarefa.id, { concluida: !tarefa.concluida })) {
      renderizar();
      avisar(tarefa.concluida ? "Tarefa reaberta." : "Muito bem! Mais uma tarefa concluída.");
      const proximo = [...lista.querySelectorAll('[data-acao="alternar"]')].find((b) => b.dataset.id === tarefa.id);
      (proximo || $("#filtro")).focus();
    }
  });

  $("#cancelar").addEventListener("click", () => { limparFormulario(); $("#titulo").focus(); });
  $("#busca").addEventListener("input", renderizar);
  $("#filtro").addEventListener("change", renderizar);
  $("#exportar").addEventListener("click", () => {
    const linhas = tarefas.map((t, i) => `${i + 1}. ${t.titulo}\nMatéria: ${t.materia}\nPrazo: ${dataFormatada(t.prazo)}\nPrioridade: ${prioridades[t.prioridade]}\nStatus: ${t.concluida ? "Concluída" : "Pendente"}`);
    const arquivo = new Blob(["\uFEFFESTUDA+ | MEU PLANEJAMENTO\n\n" + linhas.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meu-planejamento.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("#vazio").hidden = true;
  avisar("Carregando tarefas…");
  sincronizar().then((sucesso) => {
    if (sucesso) renderizar();
  });
}
