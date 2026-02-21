import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const ITEMS_PER_PAGE = 12;

export const useWriterProjects = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(ITEMS_PER_PAGE);
  const [showCreate, setShowCreate] = useState(false);

  const loadProjects = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/writer-api/api/projects?page=${page}&page_size=${pageSize}`);
      if (res.data.success) {
        setProjects(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
        setActivePage(res.data.data.page || 1);
      } else {
        showError(res.data.message || t('加载失败'));
      }
    } catch (e) {
      showError(e.message);
    }
    setLoading(false);
  }, [pageSize, t]);

  const createProject = useCallback(async (data) => {
    try {
      const res = await API.post('/writer-api/api/projects', data);
      if (res.data.id) {
        showSuccess(t('创建成功'));
        setShowCreate(false);
        await loadProjects(1);
        return res.data;
      } else {
        showError(res.data.message || t('创建失败'));
      }
    } catch (e) {
      showError(e.message);
    }
    return null;
  }, [loadProjects, t]);

  const deleteProject = useCallback(async (projectId) => {
    try {
      const res = await API.delete(`/writer-api/api/projects/${projectId}`);
      if (res.data.success) {
        showSuccess(t('删除成功'));
        await loadProjects(activePage);
      } else {
        showError(res.data.message || t('删除失败'));
      }
    } catch (e) {
      showError(e.message);
    }
  }, [activePage, loadProjects, t]);

  return {
    projects, loading, activePage, total, pageSize,
    showCreate, setShowCreate,
    loadProjects, createProject, deleteProject,
    t,
  };
};
