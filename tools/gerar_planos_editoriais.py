from pathlib import Path
import csv, re

ROOT = Path(__file__).resolve().parents[1]
MAT = ROOT / "materiais_curso"
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)

SONGS = ("casa é sua", "acalmo", "acalma", "atos 2", "chora israel", "espelhos",
         "espirito santo", "espírito santo", "hallelujah", "jó", "lindo és", "linkin",
         "lugar secreto", "ninguém explica", "oceans", "ousado amor", "perfect",
         "quando ele", "quando eu", "quero conhecer", "raridade", "yeshua", "josué")

def decide(name):
    n = name.casefold()
    duplicate = bool(re.search(r"versão\s*\d+|\(\d+\)", n))
    if any(s in n for s in SONGS):
        return ("Repertório/arranjo de terceiro", "ALTO", "Privado para estudo",
                "Retirar da edição pública; obter licença escrita ou substituir por peça própria/domínio público confirmado.",
                "PENDENTE: autor, arranjador, fonte e licença")
    if any(x in n for x in ("apostila", "método", "metodo", "henrique", "rafael", "licensed")):
        return ("Método ou apostila de terceiro", "ALTO", "Fonte privada",
                "Não redistribuir. Reescrever somente conceitos gerais com texto, exercícios e imagens originais; citar bibliografia.",
                "EM REESCRITA")
    if any(x in n for x in ("acorde", "escala", "caged", "campo", "invers", "pentat", "tétrade", "tetrade", "exercicio", "exercício", "dedilh", "percuss", "afinação", "afinacao")):
        return ("Material didático técnico", "MÉDIO", "Fonte de consulta",
                "Conferir autoria; converter o conceito em aula interativa própria e remover o PDF público.",
                "REVISÃO INDIVIDUAL")
    action = "Manter uma única cópia privada e excluir duplicatas da publicação." if duplicate else "Identificar autoria e licença antes de decidir; não publicar enquanto estiver pendente."
    return ("Origem não confirmada", "MÉDIO", "Quarentena", action, "PENDENTE")

def main():
    plan = OUT / "Plano_Individual_Materiais_de_Terceiros.csv"
    with plan.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Arquivo", "Categoria", "Risco", "Uso permitido agora", "Ajuste proposto", "Situação"])
        for p in sorted(MAT.glob("*.pdf"), key=lambda p: p.name.casefold()):
            w.writerow([p.name, *decide(p.name)])

    catalog = OUT / "Catalogo_Preparatorio_Livro_de_Partituras.csv"
    candidates = [
        ("Noite Feliz", "Franz Xaver Gruber / Joseph Mohr", "Confirmar arranjo", "Candidata: obra histórica; arranjo precisa ser próprio ou autorizado"),
        ("Luar do Sertão", "Catulo da Paixão Cearense / João Pernambuco", "Confirmar situação e arranjo", "Candidata condicionada à revisão jurídica e editorial"),
        ("O Natal Existe", "Informação pendente", "Não confirmado", "Não publicar sem autorização"),
        ("Allegretto", "Autor não identificado", "Não confirmado", "Manter fora do livro até identificar a fonte"),
        ("Estudo A - Polegar constante", "Escola Professor Luiz", "Original do projeto", "Liberada para o Livro - nível iniciante"),
        ("Estudo B - Melodia e baixo", "Escola Professor Luiz", "Original do projeto", "Liberada para o Livro - nível iniciante"),
        ("Estudo C - Ritmo e abafamento", "Escola Professor Luiz", "Original do projeto", "Liberada para o Livro - nível iniciante"),
    ]
    with catalog.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Título", "Autor/Compositor", "Licença ou origem", "Decisão editorial"])
        w.writerows(candidates)
    print(plan)
    print(catalog)

if __name__ == "__main__":
    main()
