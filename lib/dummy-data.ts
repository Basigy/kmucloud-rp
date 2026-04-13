// ============================================================
// MVP 더미 사건: 재벌가의 비극 (v2 - 행동 포인트 시스템)
// ============================================================

import type { Case } from '../types/game';

export const dummyCase: Case = {
  caseId: 'test_001',
  title: '재벌가의 비극',
  subtitle: '서울 강남구, 2033',
  difficulty: 'easy',

  briefing:
    '재계 10위 박성철 회장(67)이 자택 서재에서 변사체로 발견되었습니다. ' +
    '경찰은 심장마비로 추정했으나 국과수 검시관이 독극물 흔적을 발견했습니다. ' +
    '주요 용의자는 세 명. 당신에게 40번의 행동이 주어집니다.',

  victim: {
    name: '박성철',
    role: '박성철 그룹 회장',
    description: '냉정한 사업 수완으로 30년간 그룹을 키웠다. 최근 유언장을 수정했다는 소문이 있었다.',
  },

  startLocationId: 'loc_police',

  // ── 장소 ───────────────────────────────────────────────
  locations: [
    {
      id: 'loc_police',
      name: '강남 경찰서',
      shortName: '경찰서',
      icon: '🚓',
      bgFrom: '#0f172a',
      bgVia: '#1e3a5f',
      bgTo: '#0f172a',
      description: '형광등이 깜빡이는 강남 경찰서 수사 4팀 사무실. 커피 냄새와 담배 냄새가 뒤섞여 있다.',
      arrivalText: '당신은 수사 4팀 사무실에 도착했다. 서류 더미 위로 사건 파일이 올려져 있다.',
      suspectIds: [],
      moveCost: 0,
      visited: true,
      investigations: [
        {
          id: 'inv_briefing',
          name: '사건 브리핑 받기',
          icon: '📋',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          findingText: '피해자 박성철(67)은 오늘 오후 3시 30분, 자택 서재에서 가정부 이영희 씨에 의해 발견되었다. 사망 추정 시각은 오후 2시~3시. 독극물 흔적이 있어 타살 가능성이 높다.',
        },
        {
          id: 'inv_victim_info',
          name: '피해자 신원 조회',
          icon: '👤',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          findingText: '박성철(67세). 박성철 그룹 회장. 자산 규모 약 1.2조. 배우자 사망, 외동딸 박지수(34세). 주치의 김철수(52세)와는 20년 관계. 가정부 이영희(58세) 15년째 근무 중.',
        },
        {
          id: 'inv_initial_report',
          name: '초동 수사 보고서',
          icon: '📄',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          findingText: '현관 CCTV에 오후 2:30 정체불명 인물 출입. 화질 낮아 인상착의 불명. 쓰레기통에서 빈 약병 1개 발견. 서재 책상 위 혈압계 시계 14:15 정지.',
        },
      ],
    },

    {
      id: 'loc_crime',
      name: '살인 현장',
      shortName: '피해자 저택',
      icon: '🏠',
      bgFrom: '#1a0000',
      bgVia: '#2d0a0a',
      bgTo: '#0a0000',
      description:
        '강남구 논현동의 단독 저택. 붉은 경광등이 건물을 비추고 있다. ' +
        '현관 유리문 너머로 수사관들이 움직이는 실루엣이 보인다.',
      arrivalText:
        '저택 안에 발을 들였다. 고급 가구들 사이로 수사대가 분주히 움직이고 있다. ' +
        '2층 서재 문이 봉인 테이프로 막혀 있다.',
      suspectIds: ['suspect_03'],
      moveCost: 1,
      visited: false,
      investigations: [
        {
          id: 'inv_study',
          name: '서재 정밀 조사',
          icon: '🔎',
          cost: 2,
          type: 'detailed',
          isImportant: true,
          completed: false,
          evidenceId: 'ev_01',
          findingText:
            '서재 책상 위의 디지털 혈압계. 전원은 꺼져 있지만 마지막 측정 기록이 화면에 남아 있다. ' +
            '14:15. 누군가 이 시각에 혈압을 쟀다는 뜻이다. 주변에서 미묘한 약품 냄새가 난다.',
        },
        {
          id: 'inv_cctv',
          name: '현관 CCTV 분석',
          icon: '📹',
          cost: 2,
          type: 'detailed',
          isImportant: true,
          completed: false,
          evidenceId: 'ev_02',
          findingText:
            'CCTV 영상을 돌려봤다. 오후 2:30, 흰 가운을 입은 남성이 현관에서 도어락을 열고 들어갔다. ' +
            '안면 식별은 어렵지만 체형이... 의사처럼 보인다. 시간은 정확히 14:30.',
        },
        {
          id: 'inv_trash',
          name: '쓰레기통 수색',
          icon: '🗑️',
          cost: 2,
          type: 'detailed',
          isImportant: true,
          completed: false,
          evidenceId: 'ev_03',
          findingText:
            '주방 쓰레기통 깊숙이 숨겨진 투명 약병. 라벨이 제거되어 있지만 바닥에 약품 잔여물이 남아 있다. ' +
            '국과수에 의뢰하면 성분을 알 수 있을 것 같다. 지문은 닦여 있다.',
        },
        {
          id: 'inv_will',
          name: '금고 서류 확인',
          icon: '📄',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          evidenceId: 'ev_04',
          findingText:
            '반쯤 열린 금고. 유언장 수정 초안. 딸 박지수 몫이 70%에서 20%로 줄고 ' +
            '나머지는 자선단체로. 흥미롭다... 그러나 아직 서명은 없다. 레드 헤링일 수도.',
        },
        {
          id: 'inv_living',
          name: '거실 훑어보기',
          icon: '👀',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          findingText:
            '고급 가구, 빈 와인잔 두 개. 소파 쿠션이 약간 흐트러져 있다. ' +
            '당일 누군가와 대화를 나눈 것 같다. 더 중요한 단서는 다른 곳에 있을 것 같다.',
        },
      ],
    },

    {
      id: 'loc_hospital',
      name: '강남 성모병원',
      shortName: '병원',
      icon: '🏥',
      bgFrom: '#001a2c',
      bgVia: '#003d5b',
      bgTo: '#00111a',
      description:
        '강남 성모병원 외과 6층. 소독약 냄새가 진하다. ' +
        '간호사들이 바쁘게 오가는 복도 끝에 김철수의 진료실이 있다.',
      arrivalText:
        '병원 복도는 형광등 불빛 아래 차갑게 빛난다. ' +
        '김철수 교수의 진료실 문 앞에 섰다. 잠겨 있다. 넌지시 두드렸다.',
      suspectIds: ['suspect_02'],
      moveCost: 1,
      visited: false,
      investigations: [
        {
          id: 'inv_surgery_record',
          name: '수술 기록 열람',
          icon: '📋',
          cost: 2,
          type: 'detailed',
          isImportant: true,
          completed: false,
          evidenceId: 'ev_05',
          findingText:
            '수술실 담당 간호사 진술. "김철수 교수님, 오늘 14시 수술 예정이셨는데 ' +
            '갑자기 13시 45분에 급한 일이 생겼다며 수술을 다른 의사에게 넘기셨어요. ' +
            '15시 30분쯤 돌아오셨고요." 알리바이가 무너진다.',
        },
        {
          id: 'inv_drugs_cabinet',
          name: '약품 보관실 조사',
          icon: '💊',
          cost: 2,
          type: 'detailed',
          isImportant: true,
          completed: false,
          evidenceId: 'ev_06',
          findingText:
            '약품 보관실 재고 로그. 최근 일주일 사이 "염화칼륨 주사액" 2앰플 분량 불명. ' +
            '염화칼륨은 과다 투여 시 심장 정지 유발 — 심장마비로 위장 가능. ' +
            '처방전 없이 반출된 기록이 없다는 점이 더 수상하다.',
        },
        {
          id: 'inv_financial',
          name: '계좌 내역 조회',
          icon: '💳',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          evidenceId: 'ev_07',
          findingText:
            '김철수 명의 계좌에서 최근 6개월간 4억 원 인출. 해외 계좌로의 이체 시도 흔적도 있다. ' +
            '누군가에게 거액을 지불하려 했거나... 도주 자금을 준비하고 있었던 것인가.',
        },
      ],
    },

    {
      id: 'loc_gym',
      name: '강남 피트니스',
      shortName: '헬스장',
      icon: '🏋️',
      bgFrom: '#1a0e00',
      bgVia: '#3d2200',
      bgTo: '#0d0700',
      description:
        '강남구 프리미엄 피트니스 센터. 러닝머신 소리와 음악이 뒤섞인다. ' +
        '카운터 직원이 낯선 방문객을 경계한다.',
      arrivalText:
        '헬스장에 도착했다. 박지수는 이곳에서 14:00~16:00 PT 수업을 받았다고 했다. ' +
        '카운터에서 출입 기록을 확인하자.',
      suspectIds: ['suspect_01'],
      moveCost: 1,
      visited: false,
      investigations: [
        {
          id: 'inv_attendance',
          name: '출입 기록 조회',
          icon: '✅',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          evidenceId: 'ev_08',
          findingText:
            '카운터 직원 진술 및 출입 기록: 박지수 씨, 오늘 14:02 입장 — 16:10 퇴장. ' +
            '담당 PT 강사도 확인. "오늘 수업 있었어요. 열심히 하셨는데요." 알리바이 확인됨.',
        },
        {
          id: 'inv_cctv_gym',
          name: '헬스장 CCTV 확인',
          icon: '📹',
          cost: 1,
          type: 'quick',
          isImportant: false,
          completed: false,
          findingText:
            'CCTV 영상. 박지수가 14:00부터 러닝머신과 웨이트 기구를 이용하는 모습이 명확히 찍혀 있다. ' +
            '범행 시간대에 분명히 이곳에 있었다. 박지수는 범인이 아니다.',
        },
      ],
    },

    {
      id: 'loc_forensics',
      name: '국립과학수사연구원',
      shortName: '국과수',
      icon: '🔬',
      bgFrom: '#0d001a',
      bgVia: '#1a0033',
      bgTo: '#08000d',
      description:
        '서초구 국립과학수사연구원. 하얀 실험복을 입은 연구원들이 분주히 움직인다. ' +
        '형광등 아래 스테인리스 실험대와 각종 기기들이 놓여 있다.',
      arrivalText:
        '국과수 감정실에 들어섰다. 담당 연구원이 고개를 들어 당신을 바라본다.',
      suspectIds: [],
      moveCost: 1,
      visited: false,
      investigations: [
        {
          id: 'inv_toxicology',
          name: '독극물 성분 분석',
          icon: '🧪',
          cost: 2,
          type: 'detailed',
          isImportant: true,
          completed: false,
          evidenceId: 'ev_09',
          findingText:
            '국과수 감정 결과: 피해자 혈액에서 "염화칼륨(KCl)" 고농도 검출. ' +
            '과다 주입 시 심장 정지 유발. 이 물질은 병원에서만 구할 수 있다. ' +
            '약병 잔여물과도 동일 성분. 이제 퍼즐 조각이 맞춰지기 시작한다.',
        },
        {
          id: 'inv_autopsy',
          name: '부검 결과 열람',
          icon: '📊',
          cost: 2,
          type: 'detailed',
          isImportant: false,
          completed: false,
          findingText:
            '부검 보고서: 사망 추정 시각 14:10~14:30. 주사 자국 발견 (왼쪽 팔 안쪽). ' +
            '내부 출혈 없음. 스스로 주사하기 어려운 위치. 타살 확정.',
        },
      ],
    },
  ],

  // ── 용의자 ────────────────────────────────────────────
  suspects: [
    {
      id: 'suspect_01',
      name: '박지수',
      role: '피해자의 딸',
      age: 34,
      personality: '감정적이고 솔직함. 충격받은 상태.',
      alibi: '14:00~16:00 강남 피트니스 PT 수업',
      isCulprit: false,
      locationId: 'loc_gym',
      stressLevel: 25,
      portraitEmoji: '👩',
      introText: '"저... 아버지가 어떻게 된 건가요? 제발 알려주세요."',
      backstory: '박회장의 외동딸. 최근 유산 문제로 갈등이 있었으나 최근 화해의 기미가 있었다.',
      interrogated: false,
    },
    {
      id: 'suspect_02',
      name: '김철수',
      role: '주치의 (범인)',
      age: 52,
      personality: '냉정하고 논리적. 감정을 드러내지 않음.',
      alibi: '14:00~15:30 강남 성모병원 수술실',
      isCulprit: true,
      locationId: 'loc_hospital',
      stressLevel: 15,
      portraitEmoji: '👨‍⚕️',
      introText: '"무슨 일로 오셨습니까. 저는 지금 바쁩니다."',
      backstory: '박회장의 주치의로 20년 근무. 7년 전 의료 과실을 박회장에게 은폐해 달라 요청했으나 최근 박회장이 이를 폭로하겠다고 협박.',
      motive: '7년 전 의료 과실 폭로 위협. 의사 면허 취소 + 형사 처벌 위기.',
      interrogated: false,
    },
    {
      id: 'suspect_03',
      name: '이영희',
      role: '가정부 (신고자)',
      age: 58,
      personality: '조심스럽고 성실함. 눈치가 빠름.',
      alibi: '13:30~15:00 근처 마트 (영수증 있음)',
      isCulprit: false,
      locationId: 'loc_crime',
      stressLevel: 35,
      portraitEmoji: '👵',
      introText: '"저... 제가 발견했을 때는 이미... 선생님이..." (울먹임)',
      backstory: '15년간 박회장 저택에서 일한 베테랑 가정부. 집안 사정을 모두 알고 있다.',
      interrogated: false,
    },
  ],

  // ── 증거 ──────────────────────────────────────────────
  evidence: [
    {
      id: 'ev_01',
      name: '혈압계 (14:15 기록)',
      icon: '🩺',
      locationId: 'loc_crime',
      investigationId: 'inv_study',
      description: '서재 책상 위, 마지막 측정 14:15에 멈춤',
      detail: '디지털 혈압계 마지막 기록: 14:15. 피해자가 누군가에게 혈압을 재는 척 약물을 투여받은 것으로 추정. 주변에서 약품 냄새 감지.',
      importance: 'key',
      tags: ['시각', '의료', '현장'],
    },
    {
      id: 'ev_02',
      name: 'CCTV 영상 (14:30)',
      icon: '📹',
      locationId: 'loc_crime',
      investigationId: 'inv_cctv',
      description: '현관 CCTV, 14:30 흰 가운 착용 남성 출입',
      detail: '오후 2:30 현관에 흰 가운 착용 남성 출입. 키와 체형이 김철수와 유사. 병원에서 직접 왔음을 시사. 김철수의 알리바이와 시간이 완전히 충돌한다.',
      importance: 'key',
      tags: ['영상', '알리바이', '결정적'],
    },
    {
      id: 'ev_03',
      name: '약병 (지문 제거)',
      icon: '🧪',
      locationId: 'loc_crime',
      investigationId: 'inv_trash',
      description: '쓰레기통, 라벨 제거된 투명 약병',
      detail: '라벨 제거된 투명 약병. 지문은 닦여 있으나 내부에 잔여물 있음. 국과수 분석 의뢰 가능. 병원에서만 구할 수 있는 약품일 가능성 높음.',
      importance: 'key',
      tags: ['독극물', '현장', '분석 필요'],
    },
    {
      id: 'ev_04',
      name: '유언장 수정 초안',
      icon: '📄',
      locationId: 'loc_crime',
      investigationId: 'inv_will',
      description: '금고, 딸 박지수 유산 70→20% 감소',
      detail: '박지수의 유산이 크게 줄어든 수정 초안. 표면적으로 강력한 동기처럼 보인다. 그러나 서명이 없다. 레드 헤링일 가능성이 있다.',
      importance: 'red_herring',
      tags: ['유산', '레드헤링', '서류'],
    },
    {
      id: 'ev_05',
      name: '수술 변경 기록',
      icon: '📋',
      locationId: 'loc_hospital',
      investigationId: 'inv_surgery_record',
      description: '13:45 수술 위임, 15:30 귀환 → 알리바이 붕괴',
      detail: '간호사 진술: 김철수는 13:45에 수술을 다른 의사에게 넘기고 자리를 비웠다. 15:30 귀환. CCTV 출입 시각 14:30과 정확히 맞아떨어진다.',
      importance: 'key',
      tags: ['알리바이 붕괴', '진술', '결정적'],
    },
    {
      id: 'ev_06',
      name: '염화칼륨 재고 불명',
      icon: '💊',
      locationId: 'loc_hospital',
      investigationId: 'inv_drugs_cabinet',
      description: '약품 보관실, 염화칼륨 2앰플 분량 실종',
      detail: '염화칼륨(KCl) — 과다 주입 시 심장 정지. 심장마비로 위장 가능한 완전 범죄용 독극물. 2앰플 행방 불명. 처방 기록 없음.',
      importance: 'key',
      tags: ['독극물', '병원', '결정적'],
    },
    {
      id: 'ev_07',
      name: '김철수 계좌 (4억 인출)',
      icon: '💳',
      locationId: 'loc_hospital',
      investigationId: 'inv_financial',
      description: '최근 6개월 4억 원 인출, 해외 이체 시도',
      detail: '박회장에게 합의금을 지불하려 했거나 도주 자금 준비. 협박에 시달렸다는 증거.',
      importance: 'supporting',
      tags: ['금융', '동기', '도주'],
    },
    {
      id: 'ev_08',
      name: '박지수 출석 확인',
      icon: '✅',
      locationId: 'loc_gym',
      investigationId: 'inv_attendance',
      description: '14:02 입장~16:10 퇴장 확인 — 무죄',
      detail: '박지수의 알리바이가 완전히 확인되었다. 범행 시간대에 헬스장에 있었음이 증명됨. 더 이상 용의자 대상이 아니다.',
      importance: 'supporting',
      tags: ['알리바이', '무죄 증명'],
    },
    {
      id: 'ev_09',
      name: '독성 분석 (염화칼륨)',
      icon: '📊',
      locationId: 'loc_forensics',
      investigationId: 'inv_toxicology',
      description: '피해자 혈액 + 약병 잔여물: 염화칼륨 동일',
      detail: '국과수 최종 감정: 피해자 혈액과 약병 잔여물 모두 염화칼륨. 의도적 과다 투여에 의한 심장 정지. 병원 관계자의 소행으로 강력히 추정.',
      importance: 'key',
      tags: ['독극물', '최종 증거', '국과수'],
    },
  ],

  // ── 진실 ──────────────────────────────────────────────
  truth: {
    culpritId: 'suspect_02',
    motive: '의료 과실 폭로 위협으로 인한 파멸 위기',
    method: '염화칼륨 정맥 주사 (심장마비 위장)',
    story:
      '7년 전, 김철수는 수술 중 의료 과실로 한 환자를 잃었다. 당시 박회장이 이를 은폐해줬고, ' +
      '그것이 긴 협박의 시작이었다. 최근 박회장이 "언론에 폭로하겠다"며 추가 합의금을 요구했다. ' +
      '4억을 주었지만 부족했다. 김철수는 이미 결심했다. 병원에서 염화칼륨을 가져갔다. ' +
      '그날 오후 2:30, 20년 신뢰를 이용해 혈압 검사를 핑계로 피해자에게 약물을 주입했다.',
    confession:
      '"20년이었습니다. 20년간 그의 병을 고쳐왔어요. 그런데 그는 그 신뢰를 무기로 쓰더군요. ' +
      '4억을 줬습니다. 그래도 부족하다 했어요. 더 이상 방법이 없었습니다. ' +
      '그날 그가 혈압계를 내밀었을 때... 손이 전혀 떨리지 않았습니다. ' +
      '이상하게도, 전혀요."',
  },

  // ── 기소 선택지 ───────────────────────────────────────
  accusationOptions: {
    motives: [
      '유산 상속 분쟁',
      '의료 과실 폭로 위협',
      '재정적 협박',
      '개인적 원한',
      '우발적 사고',
    ],
    methods: [
      '독극물 투여 (심장마비 위장)',
      '둔기 가격',
      '질식사',
      '익사',
      '추락사 위장',
    ],
  },

  // ── MVP 하드코딩 심문 응답 ───────────────────────────
  interrogationResponses: {
    suspect_01: {
      alibi:
        '"제발요, 저는 헬스장에 있었다고요! PT 선생님도 있었고 CCTV도 있어요. ' +
        '왜 저를 의심하시는 거예요? 아버지가 돌아가셨는데..."',
      relationship:
        '"갈등이 없었다고 하면 거짓말이겠죠. 유산 문제로 다퉜어요. 근데 최근에는 화해했어요. ' +
        '아버지가 저를 이해하기 시작하셨거든요. 제가 왜 그러겠어요."',
      evidence_cctv:
        '"그건 저 아니에요! 그 시간에 저는 헬스장에 있었다고요. 헬스장 CCTV 확인해보세요!"',
      evidence_will:
        '(잠시 멈추다) "...그 유언장이요? 알고 있어요. 상처받았지만... 그래서 아버지를 죽이진 않아요."',
      pressure:
        '(눈물을 흘리며) "저는 아무것도 하지 않았어요. 알리바이도 있잖아요. 진짜 범인을 찾으세요!"',
    },
    suspect_02: {
      alibi:
        '"이미 말씀드렸습니다. 오늘 14:00부터 15:30까지 수술실에 있었어요. 병원에 확인하세요."',
      relationship:
        '"20년 주치의로서 환자와 신뢰 관계를 유지했습니다. 개인적인 갈등은 없었어요."',
      evidence_cctv:
        '(잠시 표정이 굳어지다) "...화질이 좋지 않군요. 닮은 사람은 많습니다. 저는 수술실에 있었어요. ' +
        '변호사를 불러도 되겠습니까?"',
      evidence_will:
        '"그건 저와 무관한 일입니다. 피해자의 가족 문제에 제가 왜 관련이 있겠습니까."',
      evidence_bottle:
        '(길게 숨을 내쉬며) "...그 약병이 어디서 나왔는지 저는 모릅니다. 병원에서 쓰는 건 맞지만 ' +
        '저만 다루는 게 아니에요." (눈이 흔들린다)',
      evidence_record:
        '(표정이 딱딱하게 굳는다) "...잠깐 자리를 비운 건 맞아요. 개인적인 일이었습니다. " ' +
        '(목소리가 약간 떨린다)',
      pressure:
        '(긴 침묵) "...당신이 생각하는 것보다 이 사건은 복잡합니다. 박회장이 어떤 사람이었는지 아십니까? ' +
        '그는 저를 20년간 이용했습니다. 더 이상은 변호사 없이 말하지 않겠습니다."',
      confession:
        '(눈을 감고 긴 침묵 후) ' +
        '"...맞습니다. 제가 했습니다.\n\n' +
        '4억을 줬어요. 그래도 부족하다 했습니다. 더 이상 방법이 없었어요. ' +
        '20년 신뢰... 그가 혈압계를 내밀었을 때 저는 이미 결심하고 있었습니다.\n\n' +
        '이상하게도, 손이 전혀 떨리지 않았어요."',
    },
    suspect_03: {
      alibi:
        '"13시 30분에 마트 갔어요. 영수증도 있고요. 돌아오니까 선생님이... (목이 메인다) ' +
        '서재에서 쓰러져 계셔서 바로 119 불렀어요."',
      relationship:
        '"선생님은 좀 엄격하셨지만 나쁜 분은 아니었어요. 15년이잖아요. 어떻게 제가 그런 일을..."',
      evidence_cctv:
        '"저 아닌 거 보이잖아요. 저는 마트에 있었어요. 마트 아는 직원도 있어요."',
      evidence_will:
        '"유언장이요? 저는 그런 거 몰라요. 그냥 청소하다가 금고 열린 거 봤는데... 건드리지 않았어요."',
      pressure:
        '"저 아니에요! 정말이에요! 범인 찾으셔야죠, 진짜 범인을요!"',
    },
  },

  // ── MVP 조사 결과 (investigationId → 텍스트) ─────────
  investigationResults: {},
};

export const casesByDifficulty: Record<string, string> = {
  easy: 'test_001',
  medium: 'coming_soon',
  hard: 'coming_soon',
  master: 'coming_soon',
};

export function getCaseById(caseId: string): Case | null {
  if (caseId === 'test_001') return dummyCase;
  return null;
}
