/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO 
} from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MapPin, 
  User, 
  Phone, 
  Package, 
  FileText, 
  X,
  Clock,
  Users,
  Loader2,
  LayoutGrid,
  Sparkles,
  Plus,
  Trash2,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';
import { Task } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Firestore Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
    setLoading(false);
  }, []);

  // Firestore Real-time Listener
  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        taskList.push({ ...doc.data(), id: doc.id } as Task);
      });
      setTasks(taskList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [startDate, endDate]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setSelectedDate(parseISO(task.date));
    setIsModalOpen(true);
  };

  const saveTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      if (editingTask) {
        const taskRef = doc(db, 'tasks', editingTask.id);
        await updateDoc(taskRef, {
          ...taskData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          userId: 'public',
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingTask ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="text-indigo-600" />
              ปฏิทินงาน
            </h1>
            <p className="text-slate-500 mt-1">จัดการตารางงานและรายละเอียดตุ๊กตา</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              <button 
                onClick={prevMonth}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold min-w-[150px] text-center capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: th })}
              </h2>
              <button 
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="calendar-grid border-b border-slate-200 bg-slate-50/50">
              {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(day => (
                <div key={day} className="py-4 text-center text-sm font-bold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="calendar-grid">
              {calendarDays.map((day, idx) => {
                const dayTasks = tasks.filter(t => isSameDay(parseISO(t.date), day));
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "calendar-day p-2 border-r border-b border-slate-100 transition-colors cursor-pointer hover:bg-slate-50",
                      !isCurrentMonth && "bg-slate-50/30 text-slate-300",
                      isToday && "bg-indigo-50/30"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        isToday ? "bg-indigo-600 text-white" : "text-slate-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id}
                          onClick={(e) => handleTaskClick(e, task)}
                          className="text-[10px] md:text-xs p-1.5 bg-indigo-100 text-indigo-700 rounded-lg truncate font-medium border border-indigo-200 hover:bg-indigo-200 transition-colors"
                        >
                          {task.startTime}-{task.endTime} {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTask ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'} - {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: th })}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <TaskForm 
                  initialData={editingTask} 
                  selectedDate={selectedDate}
                  onSave={saveTask}
                  onDelete={editingTask ? () => deleteTask(editingTask.id) : undefined}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TaskFormProps {
  initialData: Task | null;
  selectedDate: Date | null;
  onSave: (task: Omit<Task, 'id'>) => void;
  onDelete?: () => void;
}

function TaskForm({ initialData, selectedDate, onSave, onDelete }: TaskFormProps) {
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    title: '',
    location: '',
    date: selectedDate ? selectedDate.toISOString() : new Date().toISOString(),
    startTime: '',
    endTime: '',
    jobType: 'event',
    responsiblePerson: '',
    customerName: '',
    customerPhone: '',
    coordinatorPhone: '',
    dolls: {
      normal: 0,
      licensedEquivalent: 0,
      authenticLicensed: 0
    },
    otherEquipment: '',
    notes: '',
    cabinetCount: 0,
    hasDecoration: false,
    decorationItems: []
  });

  const [newDecorationItem, setNewDecorationItem] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate.toISOString() }));
    }
  }, [initialData, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <FileText size={14} /> ชื่องาน
            </label>
            <input 
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="ระบุชื่องาน"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <MapPin size={14} /> สถานที่
            </label>
            <input 
              required
              type="text"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="ระบุสถานที่"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Briefcase size={14} /> รูปแบบงาน
            </label>
            <input 
              required
              type="text"
              value={formData.jobType}
              onChange={e => setFormData({ ...formData, jobType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="ระบุรูปแบบงาน (เช่น ติดตั้ง, รื้อถอน)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Clock size={14} /> เวลาเริ่ม
              </label>
              <input 
                required
                type="time"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Clock size={14} /> เวลาสิ้นสุด
              </label>
              <input 
                required
                type="time"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <User size={14} /> ผู้รับผิดชอบ
            </label>
            <input 
              required
              type="text"
              value={formData.responsiblePerson}
              onChange={e => setFormData({ ...formData, responsiblePerson: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="ชื่อผู้รับผิดชอบ"
            />
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Users size={14} /> ลูกค้า
            </label>
            <input 
              required
              type="text"
              value={formData.customerName}
              onChange={e => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="ชื่อลูกค้า"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Phone size={14} /> เบอร์ลูกค้า
            </label>
            <input 
              required
              type="tel"
              value={formData.customerPhone}
              onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="08x-xxx-xxxx"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Phone size={14} /> เบอร์ติดต่อคนประสานงาน
            </label>
            <input 
              required
              type="tel"
              value={formData.coordinatorPhone}
              onChange={e => setFormData({ ...formData, coordinatorPhone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="08x-xxx-xxxx"
            />
          </div>
        </div>
      </div>

      {/* Dolls Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Package size={16} /> รายละเอียดตุ๊กตา
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">ประเภทธรรมดา</label>
              <input 
                type="number"
                min="0"
                value={formData.dolls.normal}
                onChange={e => setFormData({ 
                  ...formData, 
                  dolls: { ...formData.dolls, normal: parseInt(e.target.value) || 0 } 
                })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">เทียบลิขสิทธิ์</label>
              <input 
                type="number"
                min="0"
                value={formData.dolls.licensedEquivalent}
                onChange={e => setFormData({ 
                  ...formData, 
                  dolls: { ...formData.dolls, licensedEquivalent: parseInt(e.target.value) || 0 } 
                })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">ลิขสิทธิ์แท้</label>
              <input 
                type="number"
                min="0"
                value={formData.dolls.authenticLicensed}
                onChange={e => setFormData({ 
                  ...formData, 
                  dolls: { ...formData.dolls, authenticLicensed: parseInt(e.target.value) || 0 } 
                })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <LayoutGrid size={16} /> รายละเอียดตู้
          </h4>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">จำนวนตู้</label>
              <input 
                type="number"
                min="0"
                value={formData.cabinetCount}
                onChange={e => setFormData({ ...formData, cabinetCount: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox"
                id="hasDecoration"
                checked={formData.hasDecoration}
                onChange={e => setFormData({ ...formData, hasDecoration: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="hasDecoration" className="text-sm font-medium text-slate-700 cursor-pointer">
                มีการตกแต่งตู้
              </label>
            </div>

            {formData.hasDecoration && (
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Sparkles size={12} /> แต่งตรงไหนบ้าง
                </label>
                
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newDecorationItem}
                    onChange={e => setNewDecorationItem(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newDecorationItem.trim()) {
                          setFormData({
                            ...formData,
                            decorationItems: [...formData.decorationItems, newDecorationItem.trim()]
                          });
                          setNewDecorationItem('');
                        }
                      }
                    }}
                    placeholder="ระบุจุดที่ตกแต่ง"
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newDecorationItem.trim()) {
                        setFormData({
                          ...formData,
                          decorationItems: [...formData.decorationItems, newDecorationItem.trim()]
                        });
                        setNewDecorationItem('');
                      }
                    }}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                  {formData.decorationItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 text-sm">
                      <span className="text-slate-600">{item}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const newList = [...formData.decorationItems];
                          newList.splice(index, 1);
                          setFormData({ ...formData, decorationItems: newList });
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.decorationItems.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">ยังไม่มีรายการตกแต่ง</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment & Notes */}
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">อุปกรณ์อื่นๆ</label>
          <textarea 
            value={formData.otherEquipment}
            onChange={e => setFormData({ ...formData, otherEquipment: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
            placeholder="ระบุอุปกรณ์เพิ่มเติม"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">หมายเหตุ</label>
          <textarea 
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
            placeholder="ระบุหมายเหตุเพิ่มเติม"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-100">
        {onDelete && (
          <button 
            type="button"
            onClick={onDelete}
            className="px-6 py-2.5 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors"
          >
            ลบงาน
          </button>
        )}
        <div className="flex-1 flex justify-end gap-3">
          <button 
            type="submit"
            className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
          >
            บันทึก
          </button>
        </div>
      </div>
    </form>
  );
}
