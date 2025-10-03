import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { ChevronLeft, ChevronRight, Users, Download, BarChart3, Trophy, Medal, Award, AlertCircle, Check, Mail, MailCheck, BookOpen } from 'lucide-react'
import explicacoesDons from './assets/explicacoes_dons'
import html2pdf from 'html2pdf.js'
import { salvarResultado } from './lib/firebaseService'
import { enviarEmailUsuario, enviarEmailSecretaria } from './lib/emailService'
import dadosFormulario from './assets/dados_formulario.json'
import './App.css'

const params = new URLSearchParams(window.location.search)
const DEV = params.has('dev')
const STEP_OVERRIDE = Number(params.get('step') || NaN)
const EMAIL_ON = params.get('email') !== 'false'

function App() {
  const [currentStep, setCurrentStep] = useState(
    Number.isFinite(STEP_OVERRIDE) ? STEP_OVERRIDE : 0
  )

  const [formData, setFormData] = useState(() => ({
    nome: DEV ? 'Teste Rápido' : '',
    igreja: DEV ? 'AEAV' : '',
    email: DEV ? 'dev@example.com' : '',
    respostas: {}
  }))

  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'success', 'error', null
  const [autoSaved, setAutoSaved] = useState(false)
  const [emailStatus, setEmailStatus] = useState({
    enviando: false,
    secretaria: null, // 'success' | 'error' | 'not_configured' | 'skipped'
    usuario: null     // 'success' | 'error' | 'not_configured' | 'skipped'
  })
  const resultadosRef = useRef(null)

  const ORGANIZACOES_ENVIO = new Map([
    ['AEAV', 'rafaelgoncalves@aeav.org'],
    ['Paranáfrigor', 'joaquim@paranafrigor.com.br'],
    ['OBPC Cascavel - São Cristóvão', null],
    ['OBPC Cafelândia', 'ti@obpccafelandia.org'],
    ['Sem organização', null]
  ])
  const deveEnviarParaCoordenacao = (org) => Boolean(ORGANIZACOES_ENVIO.get(org))

  const MAPA_SINONIMOS = {
    'Encorajamento': 'Encorajamento (ou Exortação)',
    'Oração': 'Oração (ou Intercessão)',
    'Serviço Prático': 'Serviço'
  }

  const totalSteps = 9
  const progressPercentage = (currentStep / totalSteps) * 100

  const opcoesResposta = [
    { label: 'Discordo Plenamente', pontuacao: 0,  cor: 'border-blue-400', corPreenchida: 'bg-blue-400 border-blue-400', tamanho: 'w-10 h-10 md:w-12 md:h-12' },
    { label: 'Discordo',            pontuacao: 10, cor: 'border-blue-400', corPreenchida: 'bg-blue-400 border-blue-400', tamanho: 'w-8  h-8  md:w-10 md:h-10' },
    { label: 'Neutro',              pontuacao: 20, cor: 'border-gray-400', corPreenchida: 'bg-gray-400 border-gray-400', tamanho: 'w-6  h-6  md:w-8  md:h-8'  },
    { label: 'Concordo',            pontuacao: 30, cor: 'border-green-500',corPreenchida: 'bg-green-500 border-green-500', tamanho: 'w-8  h-8  md:w-10 md:h-10' },
    { label: 'Concordo Plenamente', pontuacao: 40, cor: 'border-green-500',corPreenchida: 'bg-green-500 border-green-500', tamanho: 'w-10 h-10 md:w-12 md:h-12' }
  ]

  useEffect(() => {
    if (currentStep > 0) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  useEffect(() => {
    if (currentStep === 9 && !autoSaved) salvarAutomaticamenteEEnviarEmails()
  }, [currentStep, autoSaved])

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }
  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  const handleAnswerChange = (perguntaId, pontuacao) => {
    setFormData(prev => ({
      ...prev,
      respostas: { ...prev.respostas, [perguntaId]: pontuacao }
    }))
  }

  const calcularResultados = () => {
    const resultados = dadosFormulario.gabarito.dons.map(dom => {
      const pontuacaoTotal = dom.perguntas.reduce((total, perguntaId) => {
        return total + (formData.respostas[perguntaId] || 0)
      }, 0)

      return {
        nome: dom.nome,
        pontuacao: pontuacaoTotal,
        percentual: Math.round((pontuacaoTotal / 280) * 100)
      }
    })

    return resultados.sort((a, b) => b.pontuacao - a.pontuacao)
  }

  const salvarAutomaticamenteEEnviarEmails = async () => {
    if (autoSaved) return
    setIsSaving(true)
    setSaveStatus(null)
    setEmailStatus({ enviando: true, secretaria: null, usuario: null })

    try {
      const resultados = calcularResultados()
      const docId = await salvarResultado(formData, resultados)
      console.log('Resultado salvo com ID:', docId)
      setSaveStatus('success')
      setAutoSaved(true)

      if (!EMAIL_ON) {
        setEmailStatus({ enviando: false, secretaria: 'skipped', usuario: 'skipped' })
        setIsSaving(false)
        return
      }

      const destinoOrg = ORGANIZACOES_ENVIO.get(formData.igreja)
      const deveEnviarCoordenacao = Boolean(destinoOrg)

      let resCoordenacao = { success: true, skipped: true }
      if (deveEnviarCoordenacao) {
        resCoordenacao = await enviarEmailSecretaria(formData, resultados, destinoOrg)
        console.log('[EMAIL] coordenação ->', destinoOrg, resCoordenacao)
        await new Promise(r => setTimeout(r, 1200))
      }

      const resUsuario = await enviarEmailUsuario(formData, resultados)
      console.log('[EMAIL] usuário ->', formData.email, resUsuario)

      const normalize = (r) => {
        if (r?.success) return 'success'
        if (r?.error === 'not_configured') return 'not_configured'
        if (r?.error === 'invalid_public_key') return 'error'
        return 'error'
      }

      setEmailStatus({
        enviando: false,
        secretaria: deveEnviarCoordenacao ? normalize(resCoordenacao) : 'skipped',
        usuario: formData.email ? normalize(resUsuario) : 'skipped'
      })
    } catch (error) {
      console.error('Erro ao salvar/enviar:', error)
      setSaveStatus('error')
      setEmailStatus({ enviando: false, secretaria: 'error', usuario: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const sanitizarCores = (root) => {
    const hasOKLCH = (v) => typeof v === 'string' && v.includes('oklch(')
    const setSafe = (el, prop, val) => { try { el.style[prop] = val } catch {} }

    const processEl = (el) => {
      const cs = getComputedStyle(el)
      if (hasOKLCH(cs.backgroundImage) || hasOKLCH(cs.background)) {
        setSafe(el, 'backgroundImage', 'none')
        if (hasOKLCH(cs.backgroundColor)) {
          setSafe(el, 'backgroundColor', '#ffffff')
        } else {
          setSafe(el, 'backgroundColor', cs.backgroundColor || '#ffffff')
        }
      }
      if (hasOKLCH(cs.backgroundColor)) setSafe(el, 'backgroundColor', '#ffffff')
      if (hasOKLCH(cs.color)) setSafe(el, 'color', '#111111')
      ;['borderTopColor','borderRightColor','borderBottomColor','borderLeftColor'].forEach((p) => {
        if (hasOKLCH(cs[p])) setSafe(el, p, '#e5e7eb')
      })
    }

    processEl(root)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    let node
    while ((node = walker.nextNode())) processEl(node)
    root.querySelectorAll('.bg-gradient-to-r').forEach((el) => {
      el.style.backgroundImage = 'linear-gradient(90deg, #4f46e5, #8b5cf6)'
    })
  }

  const exportarPDF = async () => {
    if (!resultadosRef.current) {
      alert('Não encontrei a seção de resultados para exportar.')
      return
    }

    setIsExporting(true)

    const original = resultadosRef.current
    const clone = original.cloneNode(true)

    Object.assign(clone.style, {
      background: '#ffffff',
      padding: '24px',
      width: '794px',
      maxWidth: '794px',
      boxShadow: 'none'
    })

    document.body.appendChild(clone)
    sanitizarCores(clone)

    try {
      const filenameSafe =
        `Teste_dos_Dons_${(formData.nome || 'Participante').replace(/[^\w]+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`

      const options = {
        margin: [10, 10, 10, 10],
        filename: filenameSafe,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: Math.min(2, window.devicePixelRatio || 2),
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: -window.scrollY,
          windowWidth: clone.scrollWidth,
          windowHeight: clone.scrollHeight
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      }

      await html2pdf().set(options).from(clone).save()
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert(`Erro ao gerar PDF: ${error?.message || error}`)
    } finally {
      setIsExporting(false)
      if (clone && clone.parentNode) clone.parentNode.removeChild(clone)
    }
  }

  const renderInicio = () => (
    <Card className="w-full max-w-2xl mx-auto"> 
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-primary mb-2">
          {dadosFormulario.titulo}
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          {dadosFormulario.subtitulo}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-900 mb-2">Como funciona?</h3>
          <p className="text-blue-800 text-sm">
            {dadosFormulario.instrucoes}
          </p>
          <p className="text-blue-800 text-sm mt-2">
            Este teste possui 7 seções com 13 perguntas cada. Responda com sinceridade 
            para descobrir seus dons espirituais.
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Digite seu nome completo"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="organizacao">Organização *</Label>
            <Select value={formData.igreja} onValueChange={(value) => handleInputChange('igreja', value)}>
              <SelectTrigger className="mt-1" id="organizacao">
                <SelectValue placeholder="Selecione sua organização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OBPC Cascavel - São Cristóvão">OBPC Cascavel - São Cristóvão</SelectItem>
                <SelectItem value="OBPC Cafelândia">OBPC Cafelândia</SelectItem>
                <SelectItem value="AEAV">AEAV</SelectItem>
                <SelectItem value="Paranáfrigor">Paranáfrigor</SelectItem>
                <SelectItem value="Sem organização">Sem organização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Seu Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Digite seu email para receber os resultados"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se informado, você receberá uma cópia dos resultados por email
            </p>
          </div>
        </div>

        {deveEnviarParaCoordenacao(formData.igreja) && (
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Envio Automático de Resultados
            </h3>
            <p className="text-green-800 text-sm">
              Os resultados serão enviados automaticamente para a <strong>coordenação da organização</strong> 
              e para seu e-mail (se informado) ao final do teste.
            </p>
          </div>
        )}

        <Button 
          onClick={handleNext}
          disabled={!formData.nome.trim() || !formData.igreja.trim()}
          className="w-full"
          size="lg"
        >
          Começar o Teste
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )

  const renderAviso = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-orange-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-orange-700">
          Atenção: Chame alguém que te conhece bem!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <p className="text-orange-800 text-lg leading-relaxed">
            A próxima seção deve ser respondida por uma <strong>pessoa próxima a você</strong> 
            (cônjuge, amigo próximo, líder espiritual). As perguntas são sobre como essa 
            pessoa enxerga seus dons e talentos.
          </p>
          <p className="text-orange-800 mt-4">
            <strong>Entregue o dispositivo para ela/ele continuar.</strong>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handlePrevious} className="flex-1 w-full">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} className="flex-1 w-full">
            Estou pronto(a) para continuar
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderTeste = (testeIndex) => {
    const teste = dadosFormulario.testes[testeIndex - 1]
    if (!teste) return null

    const isTesteCompleto = teste.perguntas.every((_, index) => {
      const perguntaId = (testeIndex - 1) * 13 + index + 1
      return formData.respostas[perguntaId] !== undefined
    })

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {teste.titulo}
          </CardTitle>
          <p className="text-center text-muted-foreground text-lg">
            Marque o quanto você concorda ou discorda com cada afirmação
          </p>
          {teste.observacao && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
              <p className="text-yellow-800 text-sm">
                <strong>Observação:</strong> {teste.observacao}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {teste.perguntas.map((pergunta, index) => {
              const perguntaId = (testeIndex - 1) * 13 + index + 1
              const respostaSelecionada = formData.respostas[perguntaId]
              
              return (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <p className="font-medium mb-6">
                    <span className="text-primary font-bold">{perguntaId}.</span> {pergunta}
                  </p>
                  
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                      <span>Discordo</span>
                      <span>Concordo</span>
                    </div>
                    <div className="flex justify-between items-center px-2">
                      {opcoesResposta.map((opcao, opcaoIndex) => {
                        const isSelected = respostaSelecionada === opcao.pontuacao
                        return (
                          <button
                            key={opcaoIndex}
                            onClick={() => handleAnswerChange(perguntaId, opcao.pontuacao)}
                            className={`${opcao.tamanho} rounded-full border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                              isSelected 
                                ? `${opcao.corPreenchida} text-white shadow-lg` 
                                : `${opcao.cor} bg-white hover:bg-gray-50`
                            }`}
                            title={opcao.label}
                          >
                            {isSelected && <Check className="w-3 h-3 md:w-4 md:h-4" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="flex gap-3 mt-8">
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={handleNext} className="flex-1" disabled={!isTesteCompleto}>
              {testeIndex === 7 ? 'Ver Resultados' : 'Próxima Seção'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderResultados = () => {
    const resultados = calcularResultados()
    const top3 = resultados.slice(0, 3)
    
    const getIconForPosition = (position) => {
      switch (position) {
        case 0: return <Trophy className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
        case 1: return <Medal className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
        case 2: return <Award className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
        default: return null
      }
    }

    const getColorForPosition = (position) => {
      switch (position) {
        case 0: return 'from-yellow-400 to-yellow-600'
        case 1: return 'from-gray-400 to-gray-600'
        case 2: return 'from-orange-400 to-orange-600'
        default: return 'from-blue-400 to-blue-600'
      }
    }
    
    return (
      <div className="space-y-4 md:space-y-6 px-2 md:px-4">
        {(saveStatus || isSaving || emailStatus.enviando) && (
          <div className="max-w-6xl mx-auto space-y-3 no-print">
            <div className={`p-3 md:p-4 rounded-lg border text-sm md:text-base ${
              saveStatus === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : saveStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Salvando resultados...</span>
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <div className="h-4 w-4 bg-green-600 rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    </div>
                    <span>Resultados salvos automaticamente!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>Erro ao salvar resultados. Verifique sua conexão.</span>
                  </>
                )}
              </div>
            </div>

            {/* Status de Email */}
            <div className="p-3 md:p-4 rounded-lg border text-sm md:text-base bg-purple-50 border-purple-200 text-purple-800">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4" />
                  <span>Status do Envio de Emails</span>
                </div>
                
                {emailStatus.enviando ? (
                  <div className="flex items-center gap-2 ml-6">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                    <span>Enviando emails...</span>
                  </div>
                ) : (
                  <div className="ml-6 space-y-1">
                    {deveEnviarParaCoordenacao(formData.igreja) && (
                      <div className="flex items-center gap-2">
                        {emailStatus.secretaria === 'success' ? (
                          <MailCheck className="h-3 w-3 text-green-600" />
                        ) : emailStatus.secretaria === 'not_configured' ? (
                          <AlertCircle className="h-3 w-3 text-orange-600" />
                        ) : emailStatus.secretaria === 'skipped' ? (
                          <AlertCircle className="h-3 w-3 text-gray-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span className="text-xs">
                          Coordenação da organização: {
                            emailStatus.secretaria === 'success' ? 'Enviado com sucesso' :
                            emailStatus.secretaria === 'not_configured' ? 'Não enviado :(' :
                            emailStatus.secretaria === 'skipped' ? 'Não aplicável' :
                            'Erro no envio'
                          }
                        </span>
                      </div>
                    )}
                    
                    {formData.email && (
                      <div className="flex items-center gap-2">
                        {emailStatus.usuario === 'success' ? (
                          <MailCheck className="h-3 w-3 text-green-600" />
                        ) : emailStatus.usuario === 'not_configured' ? (
                          <AlertCircle className="h-3 w-3 text-orange-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span className="text-xs">
                          Seu email ({formData.email}): {
                            emailStatus.usuario === 'success' ? 'Enviado com sucesso' :
                            emailStatus.usuario === 'not_configured' ? 'Não enviado :(' :
                            'Erro no envio'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={resultadosRef} id="print-area" className="w-full max-w-6xl mx-auto bg-white">
          <Card className="border-0 shadow-lg md:shadow-2xl">
            <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg p-4 md:p-6 print-header">
              <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center mb-3 md:mb-4">
                <BarChart3 className="h-8 w-8 md:h-10 md:w-10" />
              </div>
              <CardTitle className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">
                Parabéns, {formData.nome}!
              </CardTitle>
              <p className="text-blue-100 text-lg md:text-xl">
                Descubra seus principais dons espirituais
              </p>
            </CardHeader>
            <CardContent className="p-4 md:p-8">
              {/* Top 3 Dons */}
              <div className="mb-6 md:mb-10">
                <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-gray-800">
                  🏆 Seus 3 Principais Dons
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                  {top3.map((dom, index) => (
                    <div 
                      key={dom.nome}
                      className={`relative text-center p-6 md:p-8 rounded-xl shadow-lg bg-gradient-to-br ${getColorForPosition(index)} text-white transform hover:scale-105 transition-transform print-top3-card`}
                    >
                      <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-white rounded-full p-2 md:p-3 shadow-lg">
                          {getIconForPosition(index)}
                        </div>
                      </div>
                      <div className="mt-4 md:mt-6">
                        <div className="text-3xl md:text-5xl font-bold mb-2 md:mb-3">
                          {index + 1}º
                        </div>
                        <h4 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">{dom.nome}</h4>
                        <div className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
                          {dom.pontuacao} pontos
                        </div>
                        <div className="text-sm md:text-lg opacity-90">
                          {dom.percentual}% do máximo
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Todos os Resultados */}
              <div className="mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 text-center">
                  📊 Pontuação Completa de Todos os Dons
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {resultados.map((dom, index) => (
                    <div key={dom.nome} className="flex items-center justify-between p-3 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow print-gray">                      
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm md:text-base ${
                          index < 3 ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-bold text-sm md:text-lg truncate">{dom.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
                        <div className="w-20 md:w-40 bg-gray-200 rounded-full h-2 md:h-3 print-progress-track">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 md:h-3 rounded-full print-progress" style={{ width: `${dom.percentual}%` }}></div>
                        </div>
                        <div className="text-right min-w-[60px] md:min-w-[100px]">
                          <div className="font-bold text-sm md:text-xl text-blue-600">
                            {dom.pontuacao} pts
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">
                            {dom.percentual}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações do Participante */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 md:p-6 rounded-lg mb-6 md:mb-8 border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-3 md:mb-4 text-base md:text-lg">📋 Informações do Teste</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-blue-800 text-sm md:text-base">
                  <div>
                    <strong>Nome:</strong><br />
                    {formData.nome}
                  </div>
                  <div>
                    <strong>Organização:</strong><br />
                    {formData.igreja}
                  </div>
                  <div>
                    <strong>Data:</strong><br />
                    {new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {formData.email && (
                  <div className="mt-3 text-blue-800 text-sm md:text-base">
                    <strong>Email:</strong> {formData.email}
                  </div>
                )}
              </div>

              {/* Interpretação dos Resultados */}
              <div className="bg-green-50 p-4 md:p-6 rounded-lg mb-6 md:mb-8 border border-green-200">
                <h4 className="font-bold text-green-900 mb-3 md:mb-4 text-base md:text-lg">💡 Como interpretar seus resultados</h4>
                <div className="text-green-800 space-y-2 text-sm md:text-base">
                  <p><strong>Pontuação alta (200+ pontos):</strong> Este é claramente um de seus dons principais. Busque oportunidades para desenvolvê-lo e usá-lo no ministério.</p>
                  <p><strong>Pontuação média (100-199 pontos):</strong> Você tem potencial nesta área. Com desenvolvimento, pode se tornar um dom forte.</p>
                  <p><strong>Pontuação baixa (0-99 pontos):</strong> Não é necessariamente uma área de fraqueza, mas pode não ser seu foco principal de ministério.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col gap-3 md:gap-4 justify-center max-w-6xl mx-auto px-4">
          <Button onClick={() => window.print()} variant="outline" size="lg" className="w-full md:max-w-xs md:mx-auto">
            <Download className="mr-2 h-4 md:h-5 w-4 md:w-5" />
            Imprimir / Salvar como PDF
          </Button>

          <Button onClick={() => setCurrentStep(10)} size="lg" className="w-full md:max-w-xs md:mx-auto">
            <BookOpen className="mr-2 h-4 md:h-5 w-4 md:w-5" />
            Explicação de cada dom
          </Button>

          <Button 
            onClick={() => {
              setCurrentStep(0)
              setFormData({ nome: '', igreja: '', email: '', respostas: {} })
              setSaveStatus(null)
              setAutoSaved(false)
              setEmailStatus({ enviando: false, secretaria: null, usuario: null })
            }} 
            size="lg"
            variant="secondary"
            className="w-full md:max-w-xs md:mx-auto"
          >
            Fazer Novo Teste
          </Button>
        </div>
      </div>
    )
  }

  const renderExplicacoes = () => {
    const resultados = calcularResultados()
    const top3Nomes = resultados.slice(0, 3).map(d => MAPA_SINONIMOS[d.nome] || d.nome)
    const mapaDescricoes = new Map(explicacoesDons.map(d => [d.nome, d.descricao]))

    const nomesOrdenados = [
      ...explicacoesDons.filter(d => top3Nomes.includes(d.nome)),
      ...explicacoesDons.filter(d => !top3Nomes.includes(d.nome)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    ]

    return (
      <div id="print-area" className="space-y-6 md:space-y-8 px-2 md:px-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg p-6 print-header">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold">
              Explicação de cada dom
            </CardTitle>
            <p className="text-blue-100 mt-1">Veja o significado e a aplicação prática</p>
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {nomesOrdenados.map(({ nome }) => {
                const desc = mapaDescricoes.get(nome) || 'Descrição em breve.'
                const isTop = top3Nomes.includes(nome)
                return (
                  <div
                    key={nome}
                    className={`relative p-4 rounded-xl border shadow-sm bg-white hover:shadow-md transition
                      ${isTop ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                  >
                    {isTop && (
                      <span className="absolute -top-2 right-3 inline-block text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-0.5 rounded-full shadow">
                        TOP 3
                      </span>
                    )}
                    <h4 className="font-bold text-lg text-gray-900">{nome}</h4>
                    <p className="text-gray-700 text-sm mt-2 leading-relaxed">{desc}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 no-print">
              <Button variant="outline" onClick={() => setCurrentStep(9)} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar aos resultados
              </Button>
              <Button onClick={() => window.print()} className="flex-1" variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                Imprimir / Salvar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 md:py-8 px-2 md:px-4">
      <div className="container mx-auto">
        {currentStep > 0 && currentStep < totalSteps && (
          <div className="mb-6 md:mb-8 max-w-4xl mx-auto">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2 md:h-3" />
          </div>
        )}

        {currentStep === 0 && renderInicio()}
        {currentStep >= 1 && currentStep <= 6 && renderTeste(currentStep)}
        {currentStep === 7 && renderAviso()}
        {currentStep === 8 && renderTeste(7)}
        {currentStep === 9 && renderResultados()}
        {currentStep === 10 && renderExplicacoes()}
      </div>
    </div>
  )
}

export default App
