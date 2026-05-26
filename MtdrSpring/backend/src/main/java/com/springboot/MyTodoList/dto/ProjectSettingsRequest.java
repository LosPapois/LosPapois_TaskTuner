package com.springboot.MyTodoList.dto;

public class ProjectSettingsRequest {
    private String namePj;
    private boolean autoRollover;
    private boolean autoCloseSprints;

    public String getNamePj()                         { return namePj; }
    public void setNamePj(String namePj)              { this.namePj = namePj; }

    public boolean isAutoRollover()                   { return autoRollover; }
    public void setAutoRollover(boolean autoRollover) { this.autoRollover = autoRollover; }

    public boolean isAutoCloseSprints()                        { return autoCloseSprints; }
    public void setAutoCloseSprints(boolean autoCloseSprints)  { this.autoCloseSprints = autoCloseSprints; }
}
