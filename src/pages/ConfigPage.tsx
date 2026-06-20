import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { TimezoneSelector } from "@/components/timezone-selector"

export default function ConfigPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      {/* Header — mesmo padrão de Propostas: apenas o botão Voltar */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="outline" size="sm" asChild className="mr-4">
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Título do módulo — sem borda, apenas ícone + texto */}
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Settings className="w-6 h-6" />
            {t('settings')}
          </h1>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('theme')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('selectTheme')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('chooseAppearance')}
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('language')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('selectLanguage')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('chooseLanguage')}
                  </p>
                </div>
                <LanguageSelector />
              </div>
            </CardContent>
          </Card>

          {/* Timezone Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('timezone')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('selectTimezone')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('chooseTimezone')}
                  </p>
                </div>
                <TimezoneSelector />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}