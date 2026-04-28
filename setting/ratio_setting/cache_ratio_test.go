package ratio_setting

import "testing"

func TestGetCacheRatioUsesPointFifteenForGPTAndDeepSeekModels(t *testing.T) {
	InitRatioSettings()

	tests := []struct {
		name  string
		model string
		want  float64
	}{
		{name: "mapped gpt 4o", model: "gpt-4o", want: 0.15},
		{name: "mapped gpt 5", model: "gpt-5", want: 0.15},
		{name: "xiaomu gpt 5.4", model: "gpt-5.4", want: 0.15},
		{name: "future gpt 5 mini", model: "gpt-5.4-mini", want: 0.15},
		{name: "mapped deepseek chat", model: "deepseek-chat", want: 0.15},
		{name: "future deepseek model", model: "deepseek-v3.1", want: 0.15},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := GetCacheRatio(tt.model)
			if !ok {
				t.Fatalf("GetCacheRatio(%q) ok = false", tt.model)
			}
			if got != tt.want {
				t.Fatalf("GetCacheRatio(%q) = %v, want %v", tt.model, got, tt.want)
			}
		})
	}
}

func TestGetCacheRatioLeavesNonGPTModelsUnchanged(t *testing.T) {
	InitRatioSettings()

	got, ok := GetCacheRatio("gemini-3.1-pro-preview")
	if ok {
		t.Fatalf("GetCacheRatio returned fallback for non-GPT model")
	}
	if got != 1 {
		t.Fatalf("GetCacheRatio non-GPT fallback = %v, want 1", got)
	}

	got, ok = GetCacheRatio("claude-opus-4-6")
	if !ok {
		t.Fatalf("GetCacheRatio did not find mapped Claude model")
	}
	if got != 0.1 {
		t.Fatalf("GetCacheRatio mapped Claude = %v, want 0.1", got)
	}
}

func TestGetCacheRatioStillFallsBackToFullPriceForUnknownModels(t *testing.T) {
	InitRatioSettings()

	got, ok := GetCacheRatio("custom-model-without-cache-pricing")
	if ok {
		t.Fatalf("GetCacheRatio returned ok for unknown model")
	}
	if got != 1 {
		t.Fatalf("GetCacheRatio unknown = %v, want 1", got)
	}
}
