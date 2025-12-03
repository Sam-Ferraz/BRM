import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Plus, Pencil, Trash2, Search, CheckCircle2, Calendar, User } from "lucide-react"
import { api, type FollowUpWithDetails } from "@/lib/api-client"
import { FollowUpForm } from "@/components/forms/followup-form"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function FollowUpsPage() {
  const { t } = useTranslation()
  const [followUps, setFollowUps] = useState<FollowUpWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpWithDetails | undefined>()

  const { toast } = useToast()

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}

      if (searchTerm) filters.search = searchTerm
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }

      const result = await api.followUps.getAll(filters)
      // Filter out completed follow-ups
      setFollowUps(result.data.filter(f => !f.completed))
    } catch (error) {
      toast({
        title: t('error'),
        description: t('followUpLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchFollowUps()
  }, [fetchFollowUps])

  const handleCreate = async (data: any) => {
    try {
      setFormLoading(true)
      await api.followUps.create(data)
      toast({
        title: t('success'),
        description: t('followUpCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchFollowUps()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('followUpCreateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingFollowUp) return

    try {
      setFormLoading(true)
      await api.followUps.update(editingFollowUp.id, data)
      toast({
        title: t('success'),
        description: t('followUpUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingFollowUp(undefined)
      fetchFollowUps()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('followUpUpdateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleMarkComplete = async (id: number) => {
    try {
      await api.followUps.markAsCompleted(id)
      toast({
        title: t('success'),
        description: t('followUpCompleted'),
      })
      fetchFollowUps()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('followUpUpdateError'),
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteFollowUp'))) return

    try {
      await api.followUps.delete(id)
      toast({
        title: t('success'),
        description: t('followUpDeletedSuccess'),
      })
      fetchFollowUps()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('followUpDeleteError'),
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open":
        return "default"
      case "pending":
        return "secondary"
      case "overdue":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'open':
        return t('followUpStatusOpen')
      case 'pending':
        return t('followUpStatusPending')
      case 'overdue':
        return t('followUpStatusOverdue')
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
              <h1 className="text-xl font-semibold text-foreground">{t('followUpsTitle')}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('followUpsManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchFollowUps')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingFollowUps')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('client')}</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("next_action")}
                    >
                      {t('nextAction')} {sortBy === "next_action" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("next_action_date")}
                    >
                      {t('nextActionDate')} {sortBy === "next_action_date" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('followUpStatus')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUps.map((followUp) => (
                    <TableRow
                      key={followUp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setEditingFollowUp(followUp)
                        setIsFormOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {followUp.appointment?.client || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm max-w-xs block truncate">
                          {followUp.next_action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(followUp.next_action_date), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(followUp.followup_status)}>
                          {getStatusTranslation(followUp.followup_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkComplete(followUp.id)
                            }}
                            title={t('markAsCompleted')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingFollowUp(followUp)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(followUp.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {followUps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('noFollowUpsFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <FollowUpForm
        followUp={editingFollowUp}
        appointment={editingFollowUp?.appointment}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingFollowUp(undefined)
        }}
        onSubmit={editingFollowUp ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}
