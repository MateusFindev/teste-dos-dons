import { collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

// Util: normaliza e valida o e-mail
const normalizeEmail = (email) => {
  if (!email) return null
  const e = String(email).trim().toLowerCase()
  // validação bem simples; ajuste se quiser algo mais rígido
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  return ok ? e : null
}

// Salvar resultado do teste no Firebase (AGORA COM EMAIL)
export const salvarResultado = async (dadosFormulario, resultados) => {
  try {
    const email = normalizeEmail(dadosFormulario?.email)

    const payload = {
      nome: dadosFormulario.nome,
      organizacao: dadosFormulario.igreja,
      email, // <-- novo campo
      respostas: dadosFormulario.respostas,
      resultados: resultados,
      dataRealizacao: new Date(),
      timestamp: Date.now()
    }

    const docRef = await addDoc(collection(db, 'resultados-teste-dons'), payload)
    console.log('Resultado salvo com ID: ', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Erro ao salvar resultado: ', error)
    throw error
  }
}

// Buscar todos os resultados (para análises futuras)
export const buscarResultados = async (limite = 100) => {
  try {
    const q = query(
      collection(db, 'resultados-teste-dons'),
      orderBy('timestamp', 'desc'),
      limit(limite)
    )

    const querySnapshot = await getDocs(q)
    const resultados = []

    querySnapshot.forEach((docSnap) => {
      resultados.push({
        id: docSnap.id,
        ...docSnap.data()
      })
    })

    return resultados
  } catch (error) {
    console.error('Erro ao buscar resultados: ', error)
    throw error
  }
}

// Buscar estatísticas gerais
export const buscarEstatisticas = async () => {
  try {
    const resultados = await buscarResultados(1000) // Buscar mais dados para estatísticas

    if (resultados.length === 0) {
      return null
    }

    // Calcular estatísticas dos dons mais comuns
    const estatisticasDons = {}

    resultados.forEach(resultado => {
      if (resultado.resultados && Array.isArray(resultado.resultados)) {
        // Pegar os top 3 dons de cada pessoa
        const top3 = resultado.resultados.slice(0, 3)

        top3.forEach((dom, index) => {
          if (!estatisticasDons[dom.nome]) {
            estatisticasDons[dom.nome] = {
              nome: dom.nome,
              vezesNoTop3: 0,
              vezesEm1o: 0,
              vezesEm2o: 0,
              vezesEm3o: 0,
              pontuacaoMedia: 0,
              totalPontuacao: 0,
              contadorPontuacao: 0
            }
          }

          estatisticasDons[dom.nome].vezesNoTop3++
          estatisticasDons[dom.nome].totalPontuacao += dom.pontuacao
          estatisticasDons[dom.nome].contadorPontuacao++

          if (index === 0) estatisticasDons[dom.nome].vezesEm1o++
          else if (index === 1) estatisticasDons[dom.nome].vezesEm2o++
          else if (index === 2) estatisticasDons[dom.nome].vezesEm3o++
        })
      }
    })

    // Calcular médias
    Object.keys(estatisticasDons).forEach(dom => {
      if (estatisticasDons[dom].contadorPontuacao > 0) {
        estatisticasDons[dom].pontuacaoMedia = Math.round(
          estatisticasDons[dom].totalPontuacao / estatisticasDons[dom].contadorPontuacao
        )
      }
    })

    return {
      totalTestes: resultados.length,
      estatisticasDons: Object.values(estatisticasDons)
        .sort((a, b) => b.vezesNoTop3 - a.vezesNoTop3),
      ultimaAtualizacao: new Date()
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas: ', error)
    throw error
  }
}

/**
 * OPCIONAL: atualiza o e-mail de um documento existente (útil para “corrigir” docs antigos)
 * @param {string} id - ID do doc em 'resultados-teste-dons'
 * @param {string} novoEmail
 */
export const atualizarEmailResultado = async (id, novoEmail) => {
  const email = normalizeEmail(novoEmail)
  if (!email) throw new Error('E-mail inválido')

  const ref = doc(db, 'resultados-teste-dons', id)
  await updateDoc(ref, { email })
  return { ok: true, id, email }
}
