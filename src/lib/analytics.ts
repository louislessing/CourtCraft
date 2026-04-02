declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function trackEvent(
  eventName: string,
  eventParams: Record<string, unknown> = {}
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

// ── Specific tracking helpers ────────────────────────────────────────────────

export function trackSignup(method: string = 'email'): void {
  trackEvent('sign_up', { method });
}

export function trackLogin(method: string = 'email'): void {
  trackEvent('login', { method });
}

export function trackSubscriptionConversion(params: {
  currency: string;
  value: number;
  plan?: string;
}): void {
  trackEvent('purchase', {
    currency: params.currency,
    value: params.value,
    items: [
      {
        item_id: 'courtcraft_subscription',
        item_name: params.plan || 'CourtCraft Advocate Monthly',
        price: params.value,
        quantity: 1,
      },
    ],
  });
  // Also fire a dedicated conversion event
  trackEvent('subscription_conversion', {
    currency: params.currency,
    value: params.value,
    plan: params.plan || 'monthly',
  });
}

export function trackDocumentBuilderUsage(params: {
  action: 'template_selected' | 'ai_message_sent' | 'draft_saved' | 'document_previewed';
  template?: string;
}): void {
  trackEvent('document_builder_usage', {
    action: params.action,
    template_id: params.template || 'unknown',
  });
}

// ── AI Assistant Engagement Tracking ────────────────────────────────────────

export function trackAIQuestionAsked(params: {
  caseType?: string;
  messageLength?: number;
  sessionId?: string;
}): void {
  trackEvent('ai_question_asked', {
    case_type: params.caseType || 'unknown',
    message_length: params.messageLength || 0,
    session_id: params.sessionId || 'dashboard',
  });
}

export function trackAIResponseReceived(params: {
  responseTimeMs: number;
  caseType?: string;
  sessionId?: string;
}): void {
  trackEvent('ai_response_received', {
    response_time_ms: params.responseTimeMs,
    case_type: params.caseType || 'unknown',
    session_id: params.sessionId || 'dashboard',
  });
}

export function trackAIFeatureAdoption(params: {
  feature: 'case_context_loaded' | 'chat_history_loaded' | 'streaming_response' | 'chat_cleared' | 'file_upload_used';
  caseType?: string;
}): void {
  trackEvent('ai_feature_adoption', {
    feature: params.feature,
    case_type: params.caseType || 'unknown',
  });
}

export function trackAICaseTypeDiscussed(params: {
  caseType: string;
  questionCount?: number;
}): void {
  trackEvent('ai_case_type_discussed', {
    case_type: params.caseType,
    question_count: params.questionCount || 1,
  });
}
