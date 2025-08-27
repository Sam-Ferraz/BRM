import { useState, useEffect, useCallback } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Plus, Pencil, Trash2, Search, Clock, User, HeadphonesIcon } from "lucide-react"
import { api, type Appointment } from "@/lib/api-client"
import { AppointmentForm } from "@/components/forms/appointment-form"
import { useToast } from "@/hooks/use-toast"
import { ReactiveDateTime } from "@/components/reactive-datetime"

export default function AppointmentsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [typeFilter, setTypeFilter] = useState("Todos")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>()
  
  const { toast } = useToast()

  // Check for auto-open dialog from FAB
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsFormOpen(true)
      setEditingAppointment(undefined)
      // Remove the query parameter after opening
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('new')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const filters: any = {}
      
      if (searchTerm) filters.search = searchTerm
      if (statusFilter && statusFilter !== "Todos") filters.status = statusFilter
      if (typeFilter && typeFilter !== "Todos") filters.type = typeFilter
      if (sortBy) {
        filters.sortBy = sortBy
        filters.sortOrder = sortOrder
      }
      
      const result = await api.appointments.getAll(filters)
      setAppointments(result.data)
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceLoadError'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder, toast, t])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleCreate = async (data: Omit<Appointment, "id">) => {
    try {
      setFormLoading(true)
      await api.appointments.create(data)
      toast({
        title: t('success'),
        description: t('serviceCreatedSuccess'),
      })
      setIsFormOpen(false)
      fetchAppointments()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceCreateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data: Partial<Appointment>) => {
    if (!editingAppointment) return

    try {
      setFormLoading(true)
      await api.appointments.update(editingAppointment.id, data)
      toast({
        title: t('success'),
        description: t('serviceUpdatedSuccess'),
      })
      setIsFormOpen(false)
      setEditingAppointment(undefined)
      fetchAppointments()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceUpdateError'),
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteService'))) return

    try {
      await api.appointments.delete(id)
      toast({
        title: t('success'),
        description: t('serviceDeletedSuccess'),
      })
      fetchAppointments()
    } catch (error) {
      toast({
        title: t('error'),
        description: t('serviceDeleteError'),
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
      case "Concluído":
        return "default"
      case "Em Andamento":
        return "secondary"
      case "Pendente":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "chat":
        return "destructive"
      case "call":
        return "default"
      case "in_person":
        return "secondary"
      case "visit":
        return "outline"
      default:
        return "outline"
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
              <h1 className="text-xl font-semibold text-foreground">{t('servicesTitle')}</h1>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('newService')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('servicesManagement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchServices')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">{t('allStatuses')}</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Andamento">{t('inProgress')}</SelectItem>
                  <SelectItem value="Concluído">{t('completed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">{t('allTypes')}</SelectItem>
                  <SelectItem value="chat">{t('chatType')}</SelectItem>
                  <SelectItem value="call">{t('callType')}</SelectItem>
                  <SelectItem value="in_person">{t('inPersonType')}</SelectItem>
                  <SelectItem value="visit">{t('visitType')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">{t('loadingServices')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("client")}
                    >
                      {t('client')} {sortBy === "client" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('answeredStatus')}</TableHead>
                    <TableHead 
                      className="cursor-pointer" 
                      onClick={() => handleSort("scheduled_datetime")}
                    >
                      {t('dateTime')} {sortBy === "scheduled_datetime" && (sortOrder === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {appointment.client}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(appointment.type)}>
                          {appointment.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={appointment.answered ? "default" : "destructive"}
                          className={appointment.answered ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {appointment.answered ? t('answered') : t('notAnswered')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <ReactiveDateTime 
                            value={appointment.scheduled_datetime}
                            type="datetime"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {appointment.description ? (
                          <span className="text-sm text-muted-foreground truncate max-w-32 block">
                            {appointment.description}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAppointment(appointment)
                              setIsFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(appointment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {appointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('noServicesFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AppointmentForm
        appointment={editingAppointment}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingAppointment(undefined)
        }}
        onSubmit={editingAppointment ? handleUpdate : handleCreate}
        loading={formLoading}
      />
    </div>
  )
}