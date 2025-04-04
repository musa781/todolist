import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Task, PRIORITY_LEVELS } from "@shared/schema";
import { PlusIcon, Loader2, Trash2, Flag, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConfetti } from "@/hooks/use-confetti";

const priorityColors = {
  [PRIORITY_LEVELS.LOW]: "text-gray-500",
  [PRIORITY_LEVELS.MEDIUM]: "text-orange-500",
  [PRIORITY_LEVELS.HIGH]: "text-red-500",
};

const priorityLabels = {
  [PRIORITY_LEVELS.LOW]: "Low",
  [PRIORITY_LEVELS.MEDIUM]: "Medium",
  [PRIORITY_LEVELS.HIGH]: "High",
};

type SortField = "priority" | "title" | "completed";
type SortOrder = "asc" | "desc";

export default function Home() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<number>(PRIORITY_LEVELS.LOW);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const { toast } = useToast();
  const fireConfetti = useConfetti();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTask = useMutation({
    mutationFn: async (data: { title: string; description: string; priority: number }) => {
      await apiRequest("POST", "/api/tasks", {
        title: data.title,
        description: data.description,
        completed: false,
        priority: data.priority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority(PRIORITY_LEVELS.LOW);
      toast({ description: "Task added successfully" });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({
      id,
      completed,
      priority,
      description,
    }: {
      id: number;
      completed?: boolean;
      priority?: number;
      description?: string;
    }) => {
      await apiRequest("PATCH", `/api/tasks/${id}`, { completed, priority, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ description: "Task deleted successfully" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      createTask.mutate({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        priority: newTaskPriority,
      });
    }
  };

  const toggleTaskExpanded = (taskId: number) => {
    const newExpandedTasks = new Set(expandedTasks);
    if (expandedTasks.has(taskId)) {
      newExpandedTasks.delete(taskId);
    } else {
      newExpandedTasks.add(taskId);
    }
    setExpandedTasks(newExpandedTasks);
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(searchLower) ||
          (task.description?.toLowerCase()?.includes(searchLower) ?? false)
      );
    }

    // Apply priority filter
    if (filterPriority !== "all") {
      filtered = filtered.filter(task => task.priority === parseInt(filterPriority));
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(task => {
        if (filterStatus === "completed") return task.completed;
        return !task.completed;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === "priority") {
        comparison = a.priority - b.priority;
      } else if (sortField === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === "completed") {
        comparison = (a.completed === b.completed) ? 0 : a.completed ? 1 : -1;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, search, filterPriority, filterStatus, sortField, sortOrder]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-primary">Tasks</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-8">
          <div className="flex gap-2">
            <Input
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1"
            />
            <Select
              value={newTaskPriority.toString()}
              onValueChange={(value) => setNewTaskPriority(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PRIORITY_LEVELS.LOW.toString()}>Low</SelectItem>
                <SelectItem value={PRIORITY_LEVELS.MEDIUM.toString()}>Medium</SelectItem>
                <SelectItem value={PRIORITY_LEVELS.HIGH.toString()}>High</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={createTask.isPending} size="icon">
              {createTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Textarea
            placeholder="Add a description... (optional)"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
          />
        </form>

        {/* Filtering and Sorting Controls */}
        <div className="space-y-2 mb-6">
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value={PRIORITY_LEVELS.LOW.toString()}>Low Priority</SelectItem>
                <SelectItem value={PRIORITY_LEVELS.MEDIUM.toString()}>Medium Priority</SelectItem>
                <SelectItem value={PRIORITY_LEVELS.HIGH.toString()}>High Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortField}
              onValueChange={(value) => setSortField(value as SortField)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="completed">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(order => order === "asc" ? "desc" : "asc")}
              className="flex-shrink-0"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) => {
                      if (!task.completed && checked) {
                        fireConfetti();
                      }
                      updateTask.mutate({ id: task.id, completed: !!checked });
                    }}
                  />
                  <span
                    className={`flex-1 ${
                      task.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  <Select
                    value={task.priority.toString()}
                    onValueChange={(value) =>
                      updateTask.mutate({
                        id: task.id,
                        priority: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <Flag className={`h-4 w-4 mr-2 ${priorityColors[task.priority]}`} />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PRIORITY_LEVELS.LOW.toString()}>Low</SelectItem>
                      <SelectItem value={PRIORITY_LEVELS.MEDIUM.toString()}>
                        Medium
                      </SelectItem>
                      <SelectItem value={PRIORITY_LEVELS.HIGH.toString()}>High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleTaskExpanded(task.id)}
                  >
                    {expandedTasks.has(task.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask.mutate(task.id)}
                    disabled={deleteTask.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {expandedTasks.has(task.id) && (
                  <div className="mt-4">
                    <Textarea
                      placeholder="Add a description..."
                      value={task.description || ""}
                      onChange={(e) =>
                        updateTask.mutate({
                          id: task.id,
                          description: e.target.value,
                        })
                      }
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </Card>
            ))}
            {filteredAndSortedTasks.length === 0 && (
              <p className="text-center text-muted-foreground">
                {tasks.length === 0 ? "No tasks yet. Add one above!" : "No tasks match your filters."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}