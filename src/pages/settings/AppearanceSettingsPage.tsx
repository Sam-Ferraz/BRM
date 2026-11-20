import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Palette } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { TimezoneSelector } from "@/components/timezone-selector"
import { useBottomNavPreference } from "@/hooks/use-bottom-nav-preference"

/**
 * Sub-pagina de Aparencia — agrupa as 4 preferencias visuais do usuario:
 * tema, idioma, fuso horario e navegacao (bottom nav com widgets).
 * Acessivel via widget "Aparencia" na pagina de Configuracoes.
 */
export default function AppearanceSettingsPage() {
  const { t } = useTranslation()
  const { enabled, setEnabled } = useBottomNavPreference()

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="outline" size="sm" asChild className="mr-4">
              <Link to="/settings">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backButton')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Palette className="w-6 h-6" />
            Aparência
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>{t('theme')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('selectTheme')}</p>
                  <p className="text-xs text-muted-foreground">{t('chooseAppearance')}</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('language')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('selectLanguage')}</p>
                  <p className="text-xs text-muted-foreground">{t('chooseLanguage')}</p>
                </div>
                <LanguageSelector />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('timezone')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('selectTimezone')}</p>
                  <p className="text-xs text-muted-foreground">{t('chooseTimezone')}</p>
                </div>
                <TimezoneSelector />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navegação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium mb-1">Rodapé com módulos sobrevoando</p>
                  <p className="text-xs text-muted-foreground">
                    Quando ligado, uma barra fixa aparece no rodapé de todas as telas
                    com atalhos pros módulos. Desligue se preferir uma interface mais limpa.
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
