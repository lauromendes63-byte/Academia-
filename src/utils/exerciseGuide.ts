export interface ExerciseGuideData {
  gifUrl: string;
  thumbUrl: string;
  primaryMuscle: string;
  steps: [string, string, string];
}

export function getExerciseGuide(
  exerciseId: string,
  exerciseName: string
): ExerciseGuideData {
  const lower = exerciseName.toLowerCase();

  const withThumb = (
    gifUrl: string,
    primaryMuscle: string,
    steps: [string, string, string]
  ): ExerciseGuideData => ({
    gifUrl,
    thumbUrl: gifUrl.replace(/\.gif$/i, '.png'),
    primaryMuscle,
    steps
  });

  // Rosca Bayesiana na Polia (pull_4 no seedData)
  if (
    lower.includes('bayesiana') ||
    lower.includes('baiana') ||
    lower.includes('rosca direta polia')
  ) {
    return withThumb('/exercises/pull_5.gif', 'Bíceps (Cabeça Longa & Pico)', [
      'Dê um passo à frente da polia baixa deixando o braço alongado atrás da linha do tronco.',
      'Mantenha o cotovelo fixo e flexione o antebraço à frente contraindo forte o bíceps.',
      'Retorne devagar sentindo o alongamento completo sem mover o ombro.'
    ]);
  }

  // Rosca no Banco Inclinado
  if (lower.includes('rosca') && lower.includes('inclinado')) {
    return withThumb('/exercises/pull_5_incline.gif', 'Bíceps (Cabeça Longa)', [
      'Apoie as costas no banco inclinado deixando os braços alongados para baixo.',
      'Flexione os cotovelos mantendo os ombros fixos no lugar.',
      'Desça controlando até alongar completamente o bíceps.'
    ]);
  }

  // Rosca Scott
  if (lower.includes('scott')) {
    return withThumb('/exercises/pull_6.gif', 'Bíceps Braquial', [
      'Apoie toda a parte de trás dos braços no banco Scott sem deixar folga.',
      'Suba contraindo o bíceps sem desencostar os cotovelos do apoio.',
      'Desça até quase estender o braço mantendo tensão contínua.'
    ]);
  }

  // Rosca Martelo (pull_5 no seedData)
  if (lower.includes('martelo') || lower.includes('rosca inversa')) {
    return withThumb('/exercises/pull_6_hammer.gif', 'Braquial & Antebraço', [
      'Segure os pesos em pegada neutra (palmas voltadas uma para a outra).',
      'Suba mantendo os cotovelos colados ao lado do tronco.',
      'Desça de forma controlada sem balançar o tronco.'
    ]);
  }

  // Crucifixo Invertido no Peck Deck / Face Pull (pull_3 no seedData)
  if (
    lower.includes('crucifixo invertido') ||
    lower.includes('crucifixo inverso') ||
    lower.includes('face pull') ||
    lower.includes('posterior')
  ) {
    return withThumb('/exercises/pull_4.gif', 'Deltoide Posterior', [
      'Ajuste o banco para que as mãos fiquem exatamente na altura dos ombros.',
      'Abra os braços para trás conduzindo pelos cotovelos levemente flexionados.',
      'Retorne controlando o peso sem deixar as placas baterem.'
    ]);
  }

  // Puxada Alta / Pulley
  if (
    lower.includes('puxada') ||
    lower.includes('puxador') ||
    lower.includes('pulley')
  ) {
    return withThumb(
      '/exercises/pull_1_pulldown.gif',
      'Grande Dorsal & Costas',
      [
        'Abaixe os ombros (deprima as escápulas) antes de puxar a barra.',
        'Traga a barra até a parte alta do peito conduzindo pelos cotovelos.',
        'Suba controlando o peso até alongar totalmente a dorsal.'
      ]
    );
  }

  // Barra Fixa no Graviton (pull_1 no seedData)
  if (lower.includes('barra fixa') || exerciseId === 'pull_1') {
    return withThumb('/exercises/pull_1.gif', 'Grande Dorsal & Costas', [
      'Deprima as escápulas (abaixe os ombros) antes de flexionar os cotovelos.',
      'Suba conduzindo os cotovelos em direção às costelas mantendo o peito aberto.',
      'Desça controlando o movimento até alongar totalmente a dorsal.'
    ]);
  }

  // Remada Articulada / Unilateral / Curvada
  if (
    lower.includes('remada articulada') ||
    lower.includes('cavalinho') ||
    lower.includes('remada curvada')
  ) {
    return withThumb('/exercises/pull_3.gif', 'Dorsal & Meio das Costas', [
      'Mantenha o tronco firme e a coluna alinhada.',
      'Traga os cotovelos para trás passando da linha do tronco.',
      'Retorne devagar mantendo a tensão contínua nas costas.'
    ]);
  }

  // Remada Baixa na Polia (pull_2 no seedData)
  if (lower.includes('remada') || exerciseId === 'pull_2') {
    return withThumb('/exercises/pull_2.gif', 'Costas (Espessura & Dorsal)', [
      'Mantenha a coluna neutra, peito estufado e tronco firme em 90°.',
      'Puxe o triângulo até o abdômen fechando bem as escápulas atrás.',
      'Estenda os braços à frente alongando a dorsal sem curvar a lombar.'
    ]);
  }

  // Supino Inclinado c/ Halteres (push_2 no seedData)
  if (lower.includes('supino') && lower.includes('inclinado')) {
    return withThumb(
      '/exercises/push_1.gif',
      'Peitoral Superior (Clavicular)',
      [
        'Ajuste o banco entre 30° e 45° com escápulas fechadas e cotovelos a ~45°.',
        'Desça os halteres controladamente até a linha da clavícula.',
        'Empurre para cima alinhando os pesos sobre a parte alta do peito.'
      ]
    );
  }

  // Supino Máquina
  if (lower.includes('supino máquina')) {
    return withThumb('/exercises/push_2.gif', 'Peitoral Maior', [
      'Mantenha as costas firmes no encosto e os ombros baixos.',
      'Empurre as manoplas contraindo o peitoral sem desencostar as escápulas.',
      'Retorne devagar alongando bem o peito.'
    ]);
  }

  // Supino Reto Barra ou Halteres (push_1 no seedData)
  if (lower.includes('supino') || lower.includes('flexão')) {
    return withThumb('/exercises/push_bench_press.gif', 'Peitoral Maior', [
      'Feche as escápulas contra o banco e mantenha os pés firmes no chão.',
      'Desça a barra controladamente até a linha média do esterno (peitoral).',
      'Empurre com firmeza mantendo os cotovelos levemente angulados (~45°-60°).'
    ]);
  }

  // Crucifixo no Peck Deck / Crossover (push_4 no seedData)
  if (
    lower.includes('crucifixo') ||
    lower.includes('peck deck') ||
    lower.includes('crossover')
  ) {
    return withThumb(
      '/exercises/push_pec_deck.gif',
      'Peitoral Maior (Isolamento)',
      [
        'Apoie as costas no banco e mantenha os cotovelos levemente flexionados.',
        'Feche os braços à frente esmagando o peitoral por 1 segundo no centro.',
        'Abra de forma controlada alongando o peito sem jogar os ombros para frente.'
      ]
    );
  }

  // Elevação Lateral na Polia Baixa (push_3 no seedData)
  if (lower.includes('elevação') && lower.includes('polia')) {
    return withThumb('/exercises/push_3_cable.gif', 'Deltoide Lateral', [
      'Posicione-se ao lado da polia baixa mantendo o tronco firme.',
      'Eleve o braço lateralmente até a linha do ombro guiando pelo cotovelo.',
      'Desça controlando a tensão contínua do cabo.'
    ]);
  }

  // Elevação Lateral c/ Halteres
  if (lower.includes('elevação')) {
    return withThumb('/exercises/push_3.gif', 'Deltoide Lateral', [
      'Incline-se sutilmente à frente com os cotovelos levemente flexionados.',
      'Suba os braços até a linha dos ombros sem encolher o trapézio.',
      'Desça controlando o peso até próximo da lateral da coxa.'
    ]);
  }

  // Mergulho Paralelas no Graviton (push_5 no seedData)
  if (
    lower.includes('mergulho') ||
    lower.includes('paralelas') ||
    exerciseId === 'push_5'
  ) {
    return withThumb(
      '/exercises/push_5.gif',
      'Peitoral Inferior & Tríceps',
      [
        'Mantenha os ombros baixos (longe das orelhas) e incline levemente o tronco à frente.',
        'Desça flexionando os cotovelos de forma controlada até cerca de 90°.',
        'Empurre as barras para baixo estendendo os braços com firmeza.'
      ]
    );
  }

  // Tríceps Francês / Testa (push_7 no seedData)
  if (lower.includes('francês') || lower.includes('testa')) {
    return withThumb(
      '/exercises/push_french_press.gif',
      'Tríceps (Cabeça Longa)',
      [
        'Mantenha os braços elevados e os cotovelos apontados para frente (sem abrir).',
        'Flexione os antebraços atrás da cabeça alongando bem o tríceps.',
        'Estenda completamente os cotovelos mantendo o tronco firme.'
      ]
    );
  }

  // Tríceps Polia Alta c/ Corda / Pulley (push_6 no seedData)
  if (lower.includes('tríceps')) {
    return withThumb('/exercises/push_4.gif', 'Tríceps Braquial', [
      'Cole os cotovelos ao lado das costelas e mantenha-os fixos.',
      'Estenda o antebraço para baixo abrindo a corda no final do movimento.',
      'Suba controladamente até 90° sem deixar os cotovelos subirem.'
    ]);
  }

  // Abdominal na Polia Alta c/ Corda (lower1_6 e lower2_6 no seedData)
  if (
    lower.includes('abdominal') ||
    lower.includes('prancha') ||
    exerciseId === 'lower1_6' ||
    exerciseId === 'lower2_6'
  ) {
    return withThumb('/exercises/abs_cable_crunch.gif', 'Reto Abdominal', [
      'Ajoelhe-se de frente para a polia segurando a corda firme ao lado da cabeça.',
      'Curve a coluna para baixo aproximando as costelas do quadril (sem sentar nos calcanhares).',
      'Retorne devagar alongando o abdômen sob tensão.'
    ]);
  }

  // Leg Press 45° (lower1_1, lower1_4, lower2_2 no seedData)
  if (lower.includes('leg press') || lower.includes('leg 45')) {
    return withThumb('/exercises/leg2_2.gif', 'Quadríceps & Glúteos', [
      'Mantenha o quadril e a lombar totalmente apoiados no encosto.',
      'Desça a plataforma flexionando os joelhos de forma controlada.',
      'Empurre pelos calcanhares sem travar os joelhos no topo.'
    ]);
  }

  // Agachamento Hack / Smith / Búlgaro / Sumô
  if (
    lower.includes('hack') ||
    lower.includes('agachamento') ||
    lower.includes('búlgaro') ||
    lower.includes('passada')
  ) {
    return withThumb('/exercises/leg1_1.gif', 'Quadríceps & Glúteos', [
      'Mantenha a coluna firme e o abdômen contraído.',
      'Desça flexionando os joelhos alinhados com a ponta dos pés até ~90°.',
      'Suba empurrando firme pelo meio do pé e calcanhar.'
    ]);
  }

  // Cadeira Extensora (lower1_2 e lower2_4 no seedData)
  if (lower.includes('extensora') || lower.includes('sissy')) {
    return withThumb('/exercises/leg1_2.gif', 'Quadríceps Isolado', [
      'Alinhe o joelho com o eixo da máquina e segure firme nos apoios.',
      'Estenda totalmente os joelhos contraindo forte o quadríceps no topo.',
      'Desça controlando o peso na fase excêntrica.'
    ]);
  }

  // Mesa Flexora
  if (lower.includes('mesa flexora')) {
    return withThumb('/exercises/leg2_3.gif', 'Posterior de Coxa', [
      'Mantenha o quadril pressionado contra o banco durante toda a série.',
      'Flexione os joelhos trazendo o rolo em direção ao glúteo.',
      'Desça devagar alongando bem o posterior de coxa.'
    ]);
  }

  // Cadeira Flexora (lower1_3 e lower2_3 no seedData)
  if (lower.includes('flexora')) {
    return withThumb('/exercises/leg1_3.gif', 'Posterior de Coxa', [
      'Encoste bem a lombar e ajuste a trava firme sobre as coxas.',
      'Puxe o rolo para baixo e para trás flexionando ao máximo os joelhos.',
      'Retorne de forma controlada sem soltar o peso.'
    ]);
  }

  // Stiff / RDL (lower2_1 no seedData)
  if (
    lower.includes('stiff') ||
    lower.includes('rdl') ||
    lower.includes('good morning') ||
    lower.includes('elevação pélvica')
  ) {
    return withThumb('/exercises/leg2_1.gif', 'Posterior de Coxa & Glúteo', [
      'Destrave levemente os joelhos e mantenha a coluna 100% reta.',
      'Desça os pesos rente às pernas projetando o quadril para trás.',
      'Suba contraindo glúteos e posterior ao atingir o alongamento máximo.'
    ]);
  }

  // Panturrilha Sentado
  if (lower.includes('panturrilha') && lower.includes('sentado')) {
    return withThumb('/exercises/leg2_4.gif', 'Panturrilhas (Sóleo)', [
      'Apoie a ponta dos pés na plataforma mantendo os calcanhares livres.',
      'Desça alongando bem a panturrilha na parte baixa.',
      'Suba ao máximo na ponta dos pés e segure 1 segundo no topo.'
    ]);
  }

  // Panturrilha em Pé (lower1_5 e lower2_5 no seedData)
  return withThumb('/exercises/leg1_4.gif', 'Panturrilhas (Gastrocnêmio)', [
    'Mantenha os joelhos estendidos (sem travar) e o tronco alinhado.',
    'Desça o calcanhar o máximo possível fazendo pausa de 1-2s no fundo.',
    'Suba o máximo que conseguir na ponta dos pés contraindo no topo.'
  ]);
}
