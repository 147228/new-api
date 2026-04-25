package ratio_setting

import "testing"

func TestGetCacheRatioFallsBackForVersionedModelFamilies(t *testing.T) {
	tests := []struct {
		name  string
		model string
		want  float64
	}{
		{name: "xiaomu gpt 5.4", model: "gpt-5.4", want: 0.1},
		{name: "future gpt 5 mini", model: "gpt-5.4-mini", want: 0.1},
		{name: "gemini 3.1 preview", model: "gemini-3.1-pro-preview", want: 0.25},
		{name: "claude 4.6 alias", model: "claude-sonnet-4-6", want: 0.1},
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

func TestGetCacheRatioStillFallsBackToFullPriceForUnknownModels(t *testing.T) {
	got, ok := GetCacheRatio("custom-model-without-cache-pricing")
	if ok {
		t.Fatalf("GetCacheRatio returned ok for unknown model")
	}
	if got != 1 {
		t.Fatalf("GetCacheRatio unknown = %v, want 1", got)
	}
}
