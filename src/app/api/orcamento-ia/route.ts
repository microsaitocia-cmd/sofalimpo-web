import { NextRequest, NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'GROQ_API_KEY não configurada' }, { status: 500 })

  const { mensagem, catalogo, clientes } = await req.json()

  const cat = (catalogo ?? []).map((c: { id: string; nome: string; preco: number; condicoes: { nome: string; preco: number }[] }) => {
    const conds = c.condicoes?.length
      ? c.condicoes.map((x: { nome: string; preco: number }) => `${x.nome}: R$${x.preco}`).join(', ')
      : `Padrão: R$${c.preco}`
    return `- ID:${c.id} | ${c.nome} | ${conds}`
  }).join('\n')

  const cli = (clientes ?? []).map((c: { id: string; nome: string; fone?: string }) =>
    `- ID:${c.id} | ${c.nome}${c.fone ? ` | ${c.fone}` : ''}`
  ).join('\n')

  const prompt = `Você é um assistente especializado em higienização de estofados.
Monte um orçamento com base na descrição do cliente usando o catálogo abaixo.

CATÁLOGO:
${cat}

CLIENTES CADASTRADOS:
${cli}

DESCRIÇÃO: ${mensagem}

Responda APENAS com JSON válido, sem markdown, no formato:
{
  "itens": [
    {"id": "id-do-catalogo", "nome": "Nome do item", "condicao": "Nome da condição", "quantidade": 1, "preco": 45.00}
  ],
  "total": 45.00,
  "observacoes": "",
  "resumo": "Resumo curto do orçamento",
  "nao_encontrados": [],
  "cliente_id": null
}

Regras:
- Use o ID exato do catálogo
- Multiplique a quantidade quando necessário (ex: "2 colchões" = quantidade: 2)
- Se não mencionar condição, use a condição padrão/mais barata
- Não invente itens fora do catálogo
- Se um item solicitado não existir no catálogo, NÃO o inclua em "itens"; adicione em "nao_encontrados" a descrição exata do que o cliente pediu
- Se a descrição mencionar qualquer nome de pessoa, procure na lista de CLIENTES CADASTRADOS e retorne o ID em "cliente_id"
- Se não encontrar cliente correspondente, retorne "cliente_id": null`

  let tentativa = 0
  while (true) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    })

    if (res.status === 429 && tentativa < 2) {
      tentativa++
      await new Promise(r => setTimeout(r, 3000 * tentativa))
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json({ error: `Erro ${res.status}: ${body}` }, { status: res.status })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? ''
    const clean = raw.replace(/```json?/g, '').replace(/```/g, '').trim()
    return NextResponse.json(JSON.parse(clean))
  }
}
